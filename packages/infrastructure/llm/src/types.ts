/**
 * LLM Client Types
 * LLM 클라이언트 공유 타입 정의
 */

export type LLMProvider = 'lm-studio' | 'openai' | 'anthropic';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  stream?: boolean;
}

export interface LLMCompletionResult {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string;
}

export interface LLMStreamChunk {
  content: string;
  done: boolean;
}

export interface LLMClient {
  /** LLM 제공자 이름 */
  readonly provider: LLMProvider;

  /** 채팅 완성 */
  complete(
    messages: LLMMessage[],
    options?: LLMCompletionOptions
  ): Promise<LLMCompletionResult>;

  /** 스트리밍 채팅 완성 */
  stream(
    messages: LLMMessage[],
    options?: LLMCompletionOptions
  ): AsyncGenerator<LLMStreamChunk>;

  /** 연결 상태 확인 */
  isAvailable(): Promise<boolean>;
}
