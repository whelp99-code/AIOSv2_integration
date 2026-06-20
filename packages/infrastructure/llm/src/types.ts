/**
 * LLM Client Types - Multi-Provider Edition
 * 여러 LLM 프로바이더를 지원하는 공유 타입 정의
 */

// ============================================================================
// Provider Types
// ============================================================================

/**
 * 지원되는 LLM 프로바이더
 * OpenRouter를 통해 100+ 모델 접근 가능
 */
export type LLMProvider =
  | 'openai'
  | 'anthropic'
  | 'google'
  | 'xiaomi'
  | 'lm-studio'
  | 'openrouter'      // 100+ 모델 게이트웨이
  | 'synterolink'     // Anthropic 프록시
  | 'deepseek'
  | 'groq'
  | 'mistral'
  | 'custom';         // 커스텀 엔드포인트

/**
 * 프로바이더 카테고리
 */
export type ProviderCategory = 'local' | 'cloud' | 'proxy';

/**
 * 프로바이더 설정
 */
export interface ProviderConfig {
  /** 프로바이더 식별자 */
  id: string;
  /** 프로바이더 타입 */
  type: LLMProvider;
  /** 프로바이더 카테고리 */
  category: ProviderCategory;
  /** 표시 이름 */
  displayName: string;
  /** API 기본 URL */
  baseUrl: string;
  /** API 키 환경변수명 */
  apiKeyEnv?: string;
  /** API 키 ( 직접 설정 시) */
  apiKey?: string;
  /** 기본 모델 */
  defaultModel: string;
  /** 지원되는 모델 목록 */
  supportedModels: string[];
  /** 활성화 여부 */
  enabled: boolean;
  /** 동시 요청 제한 */
  rateLimit?: {
    requestsPerMinute: number;
    tokensPerMinute: number;
  };
  /** 비용 정보 (1M 토큰당) */
  pricing?: {
    input: number;
    output: number;
    currency: string;
  };
}

// ============================================================================
// Message Types
// ============================================================================

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMCompletionOptions {
  /** 사용할 모델 (미지정 시 프로바이더 기본값) */
  model?: string;
  /** 프로바이더 지정 (미지정 시 기본 프로바이더) */
  provider?: LLMProvider;
  /** 프로바이더 ID (동적 등록 시) */
  providerId?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  stream?: boolean;
  /** 타임아웃 (ms) */
  timeoutMs?: number;
}

export interface LLMCompletionResult {
  content: string;
  model: string;
  provider: LLMProvider;
  providerId?: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string;
  /** 응답 시간 (ms) */
  latencyMs?: number;
}

export interface LLMStreamChunk {
  content: string;
  done: boolean;
  model?: string;
  provider?: LLMProvider;
}

// ============================================================================
// Client Interface
// ============================================================================

export interface LLMClient {
  /** 프로바이더 이름 */
  readonly provider: LLMProvider;
  /** 프로바이더 ID */
  readonly providerId: string;

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

  /** 지원되는 모델 목록 */
  listModels(): Promise<string[]>;
}

// ============================================================================
// Router Types
// ============================================================================

/**
 * 라우팅 전략
 */
export type RoutingStrategy =
  | 'round-robin'      // 순환 배정
  | 'least-latency'    // 가장 낮은 지연시간
  | 'cost-optimized'   // 비용 최적화
  | 'quality-first'    // 품질 우선
  | 'task-matched';    // 작업별 매칭

/**
 * 작업 타입
 */
export type TaskType =
  | 'coding'
  | 'analysis'
  | 'creative'
  | 'general'
  | 'quick'            // 빠른 응답
  | 'deep-reasoning';  // 깊은 추론

/**
 * 라우팅 규칙
 */
export interface RoutingRule {
  taskType: TaskType;
  preferredProviders: LLMProvider[];
  preferredModels?: string[];
  maxCostPer1MTokens?: number;
  maxLatencyMs?: number;
}

/**
 * 라우팅 결과
 */
export interface RoutingResult {
  provider: LLMProvider;
  providerId: string;
  model: string;
  reason: string;
}

// ============================================================================
// Registry Types
// ============================================================================

export interface ProviderRegistryEvents {
  'provider:registered': (provider: ProviderConfig) => void;
  'provider:unregistered': (providerId: string) => void;
  'provider:enabled': (providerId: string) => void;
  'provider:disabled': (providerId: string) => void;
  'provider:error': (providerId: string, error: Error) => void;
}
