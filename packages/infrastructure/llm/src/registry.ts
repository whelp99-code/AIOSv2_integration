/**
 * LLM Provider Registry
 * 여러 LLM 프로바이더를 동적으로 등록/관리
 */

import type {
  LLMProvider,
  LLMClient,
  ProviderConfig,
  LLMMessage,
  LLMCompletionOptions,
  LLMCompletionResult,
  LLMStreamChunk,
} from './types';

type RegistryEvent = (provider: ProviderConfig) => void;

/**
 * 기본 프로바이더 설정
 */
const DEFAULT_PROVIDERS: ProviderConfig[] = [
  {
    id: 'xiaomi',
    type: 'xiaomi',
    category: 'cloud',
    displayName: 'Xiaomi MiMo',
    baseUrl: 'https://api.xiaomimimo.com/v1',
    apiKeyEnv: 'XIAOMI_API_KEY',
    defaultModel: 'mimo-v2-omni',
    supportedModels: ['mimo-v2-omni', 'mimo-v2-pro', 'mimo-v2.5-pro', 'mimo-v2-flash'],
    enabled: true,
  },
  {
    id: 'openrouter',
    type: 'openrouter',
    category: 'cloud',
    displayName: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKeyEnv: 'OPENROUTER_API_KEY',
    defaultModel: 'anthropic/claude-sonnet-4',
    supportedModels: [], // 동적으로 로드
    enabled: false,
  },
  {
    id: 'synterolink',
    type: 'synterolink',
    category: 'proxy',
    displayName: 'SynteroLink (Anthropic Proxy)',
    baseUrl: 'https://api.synterolink.com',
    apiKeyEnv: 'ANTHROPIC_AUTH_TOKEN',
    defaultModel: 'claude-sonnet-4-6',
    supportedModels: ['claude-sonnet-4-6', 'claude-opus-4-7', 'claude-opus-4-6', 'claude-haiku-4-5'],
    enabled: true,
  },
  {
    id: 'lmstudio',
    type: 'lm-studio',
    category: 'local',
    displayName: 'LM Studio (Local)',
    baseUrl: 'http://localhost:1234/v1',
    defaultModel: 'local-model',
    supportedModels: [],
    enabled: false,
  },
  {
    id: 'groq',
    type: 'groq',
    category: 'cloud',
    displayName: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    apiKeyEnv: 'GROQ_API_KEY',
    defaultModel: 'llama-3.3-70b-versatile',
    supportedModels: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768', 'gemma2-9b-it'],
    enabled: false,
  },
  {
    id: 'deepseek',
    type: 'deepseek',
    category: 'cloud',
    displayName: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKeyEnv: 'DEEPSEEK_API_KEY',
    defaultModel: 'deepseek-chat',
    supportedModels: ['deepseek-chat', 'deepseek-coder'],
    enabled: false,
  },
];

/**
 * Provider Registry
 * 프로바이더 등록/관리/라우팅
 */
export class ProviderRegistry {
  private static instance: ProviderRegistry | null = null;
  private providers: Map<string, ProviderConfig> = new Map();
  private clients: Map<string, LLMClient> = new Map();
  private listeners: Map<string, Set<RegistryEvent>> = new Map();
  private healthStatus: Map<string, { available: boolean; lastChecked: number; latencyMs?: number }> = new Map();

  private constructor() {
    // 기본 프로바이더 등록
    for (const config of DEFAULT_PROVIDERS) {
      this.providers.set(config.id, { ...config });
    }
  }

  static getInstance(): ProviderRegistry {
    if (!ProviderRegistry.instance) {
      ProviderRegistry.instance = new ProviderRegistry();
    }
    return ProviderRegistry.instance;
  }

  // ========================================================================
  // CRUD Operations
  // ========================================================================

  /**
   * 프로바이더 등록
   */
  register(config: ProviderConfig): void {
    // 기존 프로바이더가 있으면 병합
    const existing = this.providers.get(config.id);
    if (existing) {
      this.providers.set(config.id, { ...existing, ...config });
    } else {
      this.providers.set(config.id, { ...config });
    }

    // 환경변수에서 API 키 로드
    if (config.apiKeyEnv && !config.apiKey) {
      const apiKey = process.env[config.apiKeyEnv];
      if (apiKey) {
        const provider = this.providers.get(config.id)!;
        provider.apiKey = apiKey;
        provider.enabled = true;
      }
    }

    this.emit('provider:registered', this.providers.get(config.id)!);
  }

  /**
   * 커스텀 프로바이더 등록 (간편 메서드)
   */
  registerCustom(params: {
    id: string;
    displayName: string;
    baseUrl: string;
    apiKey?: string;
    apiKeyEnv?: string;
    defaultModel: string;
    supportedModels?: string[];
  }): void {
    this.register({
      id: params.id,
      type: 'custom',
      category: 'cloud',
      displayName: params.displayName,
      baseUrl: params.baseUrl,
      apiKey: params.apiKey,
      apiKeyEnv: params.apiKeyEnv,
      defaultModel: params.defaultModel,
      supportedModels: params.supportedModels ?? [],
      enabled: true,
    });
  }

  /**
   * 프로바이더 제거
   */
  unregister(providerId: string): boolean {
    const existed = this.providers.delete(providerId);
    this.clients.delete(providerId);
    this.healthStatus.delete(providerId);

    if (existed) {
      this.emit('provider:unregistered', { id: providerId } as ProviderConfig);
    }
    return existed;
  }

  /**
   * 프로바이더 조회
   */
  get(providerId: string): ProviderConfig | undefined {
    return this.providers.get(providerId);
  }

  /**
   * 모든 프로바이더 목록
   */
  list(): ProviderConfig[] {
    return Array.from(this.providers.values());
  }

  /**
   * 활성화된 프로바이더만
   */
  listEnabled(): ProviderConfig[] {
    return this.list().filter((p) => p.enabled);
  }

  /**
   * 프로바이더 활성화/비활성화
   */
  setEnabled(providerId: string, enabled: boolean): void {
    const provider = this.providers.get(providerId);
    if (provider) {
      provider.enabled = enabled;
      this.emit(enabled ? 'provider:enabled' : 'provider:unregistered', provider);
    }
  }

  // ========================================================================
  // Client Management
  // ========================================================================

  /**
   * 클라이언트 등록
   */
  registerClient(providerId: string, client: LLMClient): void {
    this.clients.set(providerId, client);
  }

  /**
   * 클라이언트 조회
   */
  getClient(providerId: string): LLMClient | undefined {
    return this.clients.get(providerId);
  }

  /**
   * 프로바이더 타입으로 클라이언트 조회
   */
  getClientByType(type: LLMProvider): LLMClient | undefined {
    for (const [id, client] of this.clients) {
      if (client.provider === type) {
        return client;
      }
    }
    return undefined;
  }

  // ========================================================================
  // Health Check
  // ========================================================================

  /**
   * 프로바이더 헬스 체크
   */
  async checkHealth(providerId: string): Promise<boolean> {
    const client = this.clients.get(providerId);
    if (!client) {
      this.healthStatus.set(providerId, { available: false, lastChecked: Date.now() });
      return false;
    }

    const start = Date.now();
    try {
      const available = await client.isAvailable();
      const latencyMs = Date.now() - start;

      this.healthStatus.set(providerId, {
        available,
        lastChecked: Date.now(),
        latencyMs,
      });

      return available;
    } catch {
      this.healthStatus.set(providerId, { available: false, lastChecked: Date.now() });
      return false;
    }
  }

  /**
   * 모든 활성 프로바이더 헬스 체크
   */
  async checkAllHealth(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    await Promise.all(
      this.listEnabled().map(async (provider) => {
        const healthy = await this.checkHealth(provider.id);
        results.set(provider.id, healthy);
      })
    );

    return results;
  }

  /**
   * 헬스 상태 조회
   */
  getHealthStatus(providerId: string) {
    return this.healthStatus.get(providerId);
  }

  // ========================================================================
  // Model Operations
  // ========================================================================

  /**
   * 모든 지원 모델 목록
   */
  getAllModels(): Array<{ provider: string; model: string; providerId: string }> {
    const models: Array<{ provider: string; model: string; providerId: string }> = [];

    for (const provider of this.listEnabled()) {
      for (const model of provider.supportedModels) {
        models.push({
          provider: provider.type,
          model,
          providerId: provider.id,
        });
      }
    }

    return models;
  }

  /**
   * 모델로 프로바이더 찾기
   */
  findProviderByModel(modelName: string): ProviderConfig | undefined {
    for (const provider of this.listEnabled()) {
      if (provider.supportedModels.some((m) => m === modelName || m.includes(modelName))) {
        return provider;
      }
    }
    return undefined;
  }

  /**
   * 프로바이더의 기본 모델 조회
   */
  getDefaultModel(providerId: string): string | undefined {
    return this.providers.get(providerId)?.defaultModel;
  }

  // ========================================================================
  // Event System
  // ========================================================================

  on(event: string, callback: RegistryEvent): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  private emit(event: string, data: ProviderConfig): void {
    this.listeners.get(event)?.forEach((callback) => {
      try {
        callback(data);
      } catch (e) {
        console.error(`Registry event error [${event}]:`, e);
      }
    });
  }

  // ========================================================================
  // Serialization
  // ========================================================================

  serialize(): string {
    const configs = Array.from(this.providers.values()).map((p) => ({
      ...p,
      apiKey: undefined, // API 키는 직렬화에서 제외
    }));
    return JSON.stringify(configs, null, 2);
  }

  deserialize(data: string): void {
    try {
      const configs: ProviderConfig[] = JSON.parse(data);
      for (const config of configs) {
        this.register(config);
      }
    } catch (e) {
      console.error('Failed to deserialize providers:', e);
    }
  }
}

// 싱글톤 인스턴스
export const providerRegistry = ProviderRegistry.getInstance();
