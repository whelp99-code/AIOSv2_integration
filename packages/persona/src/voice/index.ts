/**
 * VoiceCommand - 음성 명령 연동 인터페이스
 * 
 * STT (Speech-to-Text) / TTS (Text-to-Speech) 인터페이스 정의
 * 음성 명령 → 페르소나 실행 플로우
 */

import { type PersonaType } from '../mail/classifier';

// STT 결과
export interface STTResult {
  text: string;
  confidence: number;
  language: string;
  duration: number; // milliseconds
  timestamp: string;
}

// TTS 요청
export interface TTSRequest {
  text: string;
  language?: string;
  voice?: 'male' | 'female' | 'neutral';
  speed?: number; // 0.5 ~ 2.0
  format?: 'mp3' | 'wav' | 'ogg';
}

// TTS 결과
export interface TTSResult {
  audioUrl: string;
  duration: number; // milliseconds
  format: string;
  timestamp: string;
}

// 음성 명령
export interface VoiceCommand {
  id: string;
  rawText: string;
  intent: VoiceIntent;
  entities: VoiceEntity[];
  targetPersona: PersonaType | null;
  confidence: number;
  timestamp: string;
}

// 음성 의도
export interface VoiceIntent {
  name: string;
  action: 'QUERY' | 'COMMAND' | 'CONFIRMATION' | 'CANCEL';
  description: string;
}

// 음성 엔티티
export interface VoiceEntity {
  type: 'PERSON' | 'DATE' | 'AMOUNT' | 'PROJECT' | 'TASK' | 'EMAIL';
  value: string;
  normalized: string;
  confidence: number;
}

// 음성 명령 실행 결과
export interface VoiceCommandResult {
  commandId: string;
  personaType: PersonaType;
  action: string;
  response: string;
  success: boolean;
  timestamp: string;
}

// 음성 명령 설정
export interface VoiceConfig {
  language: string;
  wakeWord: string; // "헤이 에이전트"
  sttProvider: 'google' | 'whisper' | 'custom';
  ttsProvider: 'google' | 'azure' | 'custom';
  enableContinuousListening: boolean;
  silenceTimeout: number; // milliseconds
}

/**
 * STT (Speech-to-Text) 인터페이스
 */
export interface ISTTProvider {
  /**
   * 음성 → 텍스트 변환
   */
  transcribe(audioData: Buffer | string): Promise<STTResult>;

  /**
   * 실시간 스트리밍 변환
   */
  transcribeStream(audioStream: ReadableStream): AsyncIterable<STTResult>;

  /**
   * 지원 언어 목록
   */
  getSupportedLanguages(): string[];
}

/**
 * TTS (Text-to-Speech) 인터페이스
 */
export interface ITTSProvider {
  /**
   * 텍스트 → 음성 변환
   */
  synthesize(request: TTSRequest): Promise<TTSResult>;

  /**
   * 사용 가능한 음성 목록
   */
  getAvailableVoices(): Array<{ id: string; name: string; language: string; gender: string }>;
}

/**
 * VoiceCommandProcessor - 음성 명령 처리기
 */
export class VoiceCommandProcessor {
  private config: VoiceConfig;
  private sttProvider: ISTTProvider | null = null;
  private ttsProvider: ITTSProvider | null = null;
  private commandHistory: VoiceCommand[] = [];

  constructor(config: VoiceConfig) {
    this.config = config;
  }

  /**
   * STT 프로바이더 설정
   */
  setSTTProvider(provider: ISTTProvider): void {
    this.sttProvider = provider;
  }

  /**
   * TTS 프로바이더 설정
   */
  setTTSProvider(provider: ITTSProvider): void {
    this.ttsProvider = provider;
  }

  /**
   * 텍스트 명령 처리 (STT 변환 후)
   */
  async processTextCommand(text: string): Promise<VoiceCommand> {
    console.log(`[Voice] Processing text command: "${text}"`);

    // 의도 파싱
    const intent = this.parseIntent(text);

    // 엔티티 추출
    const entities = this.extractEntities(text);

    // 대상 페르소나 결정
    const targetPersona = this.determineTargetPersona(text, intent, entities);

    const command: VoiceCommand = {
      id: `vc-${Date.now()}`,
      rawText: text,
      intent,
      entities,
      targetPersona,
      confidence: this.calculateConfidence(intent, entities),
      timestamp: new Date().toISOString(),
    };

    this.commandHistory.push(command);
    console.log(`[Voice] Command parsed: intent=${intent.name}, persona=${targetPersona}`);

    return command;
  }

  /**
   * 음성 데이터 처리 (STT 포함)
   */
  async processVoiceCommand(audioData: Buffer | string): Promise<VoiceCommand> {
    if (!this.sttProvider) {
      throw new Error('STT provider not configured');
    }

    // STT 변환
    const sttResult = await this.sttProvider.transcribe(audioData);
    console.log(`[Voice] STT result: "${sttResult.text}" (confidence: ${sttResult.confidence})`);

    // 텍스트 명령 처리
    const command = await this.processTextCommand(sttResult.text);

    return command;
  }

  /**
   * 응답 생성 (TTS 포함)
   */
  async generateResponse(result: VoiceCommandResult): Promise<TTSResult | null> {
    if (!this.ttsProvider) {
      console.log(`[Voice] TTS not available, returning text response: ${result.response}`);
      return null;
    }

    const ttsResult = await this.ttsProvider.synthesize({
      text: result.response,
      language: this.config.language,
      voice: 'neutral',
      speed: 1.0,
    });

    return ttsResult;
  }

  /**
   * 의도 파싱
   */
  private parseIntent(text: string): VoiceIntent {
    const textLower = text.toLowerCase();

    // 조회 의도
    if (textLower.includes('조회') || textLower.includes('보여') || textLower.includes('알려')) {
      return { name: 'query', action: 'QUERY', description: '정보 조회 요청' };
    }

    // 명령 의도
    if (textLower.includes('생성') || textLower.includes('만들') || textLower.includes('등록')) {
      return { name: 'create', action: 'COMMAND', description: '생성/등록 명령' };
    }

    if (textLower.includes('수정') || textLower.includes('변경') || textLower.includes('업데이트')) {
      return { name: 'update', action: 'COMMAND', description: '수정/변경 명령' };
    }

    if (textLower.includes('삭제') || textLower.includes('지워') || textLower.includes('취소')) {
      return { name: 'delete', action: 'COMMAND', description: '삭제/취소 명령' };
    }

    if (textLower.includes('승인') || textLower.includes('확인')) {
      return { name: 'confirm', action: 'CONFIRMATION', description: '승인/확인 요청' };
    }

    // 기본: 조회
    return { name: 'general', action: 'QUERY', description: '일반 질의' };
  }

  /**
   * 엔티티 추출
   */
  private extractEntities(text: string): VoiceEntity[] {
    const entities: VoiceEntity[] = [];

    // 금액 추출
    const amountMatch = text.match(/(\d{1,3}(,\d{3})*(만|억)?원?)/);
    if (amountMatch) {
      entities.push({
        type: 'AMOUNT',
        value: amountMatch[1],
        normalized: amountMatch[1].replace(/[,원]/g, ''),
        confidence: 0.9,
      });
    }

    // 날짜 추출
    const dateMatch = text.match(/(\d{4}[-/]\d{1,2}[-/]\d{1,2})|오늘|내일|이번주|다음주/);
    if (dateMatch) {
      entities.push({
        type: 'DATE',
        value: dateMatch[0],
        normalized: this.normalizeDate(dateMatch[0]),
        confidence: 0.85,
      });
    }

    // 프로젝트 추출
    const projectMatch = text.match(/프로젝트[:\s]+(\S+)/);
    if (projectMatch) {
      entities.push({
        type: 'PROJECT',
        value: projectMatch[1],
        normalized: projectMatch[1],
        confidence: 0.8,
      });
    }

    // 이메일 추출
    const emailMatch = text.match(/[\w.-]+@[\w.-]+\.\w+/);
    if (emailMatch) {
      entities.push({
        type: 'EMAIL',
        value: emailMatch[0],
        normalized: emailMatch[0].toLowerCase(),
        confidence: 0.95,
      });
    }

    return entities;
  }

  /**
   * 대상 페르소나 결정
   */
  private determineTargetPersona(text: string, intent: VoiceIntent, entities: VoiceEntity[]): PersonaType | null {
    const corpus = `${text.toLowerCase()} ${intent.name.toLowerCase()}`;

    // 의도·원문 텍스트 기반 페르소나 매핑
    if (corpus.includes('견적') || corpus.includes('판매') || corpus.includes('영업')) {
      return 'SALES';
    }
    if (corpus.includes('청구') || corpus.includes('비용') || corpus.includes('재무')) {
      return 'FINANCE';
    }
    if (corpus.includes('기술') || corpus.includes('사양') || corpus.includes('데모')) {
      return 'PRESALES';
    }
    if (corpus.includes('프로젝트') || corpus.includes('일정') || corpus.includes('작업')) {
      return 'PM';
    }
    if (corpus.includes('코드') || corpus.includes('버그') || corpus.includes('빌드')) {
      return 'ENGINEER';
    }
    if (corpus.includes('마케팅') || corpus.includes('콘텐츠') || corpus.includes('뉴스레터')) {
      return 'MARKETING';
    }
    if (corpus.includes('승인')) {
      return 'CEO';
    }

    // 엔티티 기반 매핑
    const amountEntity = entities.find(e => e.type === 'AMOUNT');
    if (amountEntity) {
      const amount = parseInt(amountEntity.normalized, 10);
      if (amount >= 1000000) return 'CEO';
      if (amount >= 100000) return 'FINANCE';
    }

    return 'WORK_SUPPORT';
  }

  /**
   * 신뢰도 계산
   */
  private calculateConfidence(intent: VoiceIntent, entities: VoiceEntity[]): number {
    let confidence = 0.5;

    // 의도 신뢰도
    if (intent.action !== 'QUERY') confidence += 0.2;

    // 엔티티 신뢰도
    if (entities.length > 0) {
      const avgEntityConfidence = entities.reduce((sum, e) => sum + e.confidence, 0) / entities.length;
      confidence += avgEntityConfidence * 0.3;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * 날짜 정규화
   */
  private normalizeDate(dateStr: string): string {
    const today = new Date();

    switch (dateStr) {
      case '오늘':
        return today.toISOString().split('T')[0];
      case '내일': {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
      }
      case '이번주': {
        const thisWeekEnd = new Date(today);
        thisWeekEnd.setDate(thisWeekEnd.getDate() + (7 - thisWeekEnd.getDay()));
        return thisWeekEnd.toISOString().split('T')[0];
      }
      case '다음주': {
        const nextWeekEnd = new Date(today);
        nextWeekEnd.setDate(nextWeekEnd.getDate() + (14 - nextWeekEnd.getDay()));
        return nextWeekEnd.toISOString().split('T')[0];
      }
      default:
        return dateStr.replace(/\//g, '-');
    }
  }

  /**
   * 명령 이력 조회
   */
  getCommandHistory(): VoiceCommand[] {
    return [...this.commandHistory];
  }

  /**
   * 설정 조회
   */
  getConfig(): VoiceConfig {
    return { ...this.config };
  }
}
