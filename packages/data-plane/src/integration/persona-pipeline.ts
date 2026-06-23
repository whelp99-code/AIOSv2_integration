/**
 * PersonaPipeline - Bronze→Silver→Gold 파이프라인에 페르소나 라우팅 통합
 * 
 * Bronze: 메일 수신 → IngestionItem 생성
 * Silver: 메일 정규화 → 분류 메타데이터 추가
 * Gold: 프로젝트 생성 → 페르소나 라우팅 실행
 */

import { hookRegistry, type GoldCompleteItem } from '../hooks';
import { publishEvent } from '../publisher';

// 페르소나 분류 결과 (외부 의존성 없이 인터페이스만 정의)
export interface PersonaClassification {
  category: string;
  confidence: number;
  matchedRules: string[];
}

// IngestionItem 인터페이스
export interface IngestionItem {
  id: string;
  source: string;
  sourceId: string;
  rawContent: string;
  normalizedContent: string | null;
  metadata: Record<string, unknown>;
  status: 'RECEIVED' | 'NORMALIZED' | 'CLASSIFIED' | 'ROUTED' | 'PROCESSED';
  createdAt: string;
  updatedAt: string;
}

// 파이프라인 처리 결과
export interface PipelineResult {
  itemId: string;
  stage: 'BRONZE' | 'SILVER' | 'GOLD';
  success: boolean;
  classification: PersonaClassification | null;
  routedTo: string | null;
  error: string | null;
  duration: number;
  timestamp: string;
}

/**
 * PersonaPipeline - 페르소나 통합 파이프라인
 */
export class PersonaPipeline {
  private classifyFn: ((item: IngestionItem) => PersonaClassification) | null = null;
  private routeFn: ((classification: PersonaClassification, item: IngestionItem) => Promise<void>) | null = null;

  /**
   * 분류 함수 등록
   */
  setClassifier(fn: (item: IngestionItem) => PersonaClassification): void {
    this.classifyFn = fn;
  }

  /**
   * 라우팅 함수 등록
   */
  setRouter(fn: (classification: PersonaClassification, item: IngestionItem) => Promise<void>): void {
    this.routeFn = fn;
  }

  /**
   * Bronze 단계: 메일 수신 → IngestionItem 생성
   */
  async processBronze(rawMail: {
    id: string;
    source: string;
    subject: string;
    from: string;
    to: string[];
    body: string;
  }): Promise<IngestionItem> {
    console.log(`[Pipeline:Bronze] Processing mail: ${rawMail.id}`);

    const item: IngestionItem = {
      id: rawMail.id,
      source: rawMail.source,
      sourceId: rawMail.id,
      rawContent: JSON.stringify(rawMail),
      normalizedContent: null,
      metadata: {
        subject: rawMail.subject,
        from: rawMail.from,
        to: rawMail.to,
      },
      status: 'RECEIVED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Bronze 이벤트 발행
    await publishEvent({
      type: 'mail-received',
      entity: 'ingestion-item',
      layer: 'bronze',
      payload: item,
    });

    console.log(`[Pipeline:Bronze] Item created: ${item.id}`);
    return item;
  }

  /**
   * Silver 단계: 메일 정규화 → 분류 메타데이터 추가
   */
  async processSilver(item: IngestionItem): Promise<IngestionItem> {
    console.log(`[Pipeline:Silver] Normalizing item: ${item.id}`);

    // 정규화
    item.normalizedContent = this.normalizeContent(item.rawContent);
    item.status = 'NORMALIZED';
    item.updatedAt = new Date().toISOString();

    // 분류 (분류 함수가 등록된 경우)
    if (this.classifyFn) {
      const classification = this.classifyFn(item);
      item.metadata.classification = classification;
      item.status = 'CLASSIFIED';
      console.log(`[Pipeline:Silver] Classified as ${classification.category} (confidence: ${classification.confidence})`);
    }

    // Silver 이벤트 발행
    await publishEvent({
      type: 'mail-normalized',
      entity: 'ingestion-item',
      layer: 'silver',
      payload: item,
    });

    console.log(`[Pipeline:Silver] Item normalized: ${item.id}`);
    return item;
  }

  /**
   * Gold 단계: 프로젝트 생성 → 페르소나 라우팅 실행
   */
  async processGold(item: IngestionItem): Promise<IngestionItem> {
    console.log(`[Pipeline:Gold] Processing item: ${item.id}`);

    // Gold 처리
    item.status = 'PROCESSED';
    item.updatedAt = new Date().toISOString();

    // Gold 이벤트 발행
    await publishEvent({
      type: 'mail-processed',
      entity: 'ingestion-item',
      layer: 'gold',
      payload: item,
    });

    // Routing Hook 실행 (페르소나 라우팅)
    const classification = item.metadata.classification as PersonaClassification | undefined;
    if (classification && this.routeFn) {
      await this.routeFn(classification, item);
      item.status = 'ROUTED';
      console.log(`[Pipeline:Gold] Routed to ${classification.category}`);
    }

    console.log(`[Pipeline:Gold] Item processed: ${item.id}`);
    return item;
  }

  /**
   * 전체 파이프라인 실행 (Bronze → Silver → Gold)
   */
  async processFullPipeline(rawMail: {
    id: string;
    source: string;
    subject: string;
    from: string;
    to: string[];
    body: string;
  }): Promise<PipelineResult> {
    const startTime = Date.now();

    try {
      // Bronze
      let item = await this.processBronze(rawMail);

      // Silver
      item = await this.processSilver(item);

      // Gold
      item = await this.processGold(item);

      const classification = item.metadata.classification as PersonaClassification | undefined;

      return {
        itemId: item.id,
        stage: 'GOLD',
        success: true,
        classification: classification || null,
        routedTo: classification?.category || null,
        error: null,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        itemId: rawMail.id,
        stage: 'BRONZE',
        success: false,
        classification: null,
        routedTo: null,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 내용 정규화
   */
  private normalizeContent(rawContent: string): string {
    try {
      const parsed = JSON.parse(rawContent);
      return JSON.stringify({
        subject: parsed.subject || '',
        from: parsed.from || '',
        to: parsed.to || [],
        body: this.cleanBody(parsed.body || ''),
        receivedAt: new Date().toISOString(),
      });
    } catch {
      return rawContent;
    }
  }

  /**
   * 본문 정리
   */
  private cleanBody(body: string): string {
    // HTML 태그 제거
    let cleaned = body.replace(/<[^>]*>/g, '');
    // 여러 공백 제거
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    return cleaned;
  }

  /**
   * Routing Hook 등록
   */
  registerHooks(): void {
    hookRegistry.register({
      onGoldComplete: async (item: GoldCompleteItem) => {
        console.log(`[Pipeline:Hook] onGoldComplete triggered for entity: ${item.entity}`);
        // 훅에서 추가 처리 가능
      },
    });
  }
}
