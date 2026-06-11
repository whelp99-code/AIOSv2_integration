/**
 * LLM Client Factory
 * LLM 클라이언트 팩토리 - 제공자별 클라이언트 생성
 */

import type { LLMClient, LLMProvider } from './types';
import { LMStudioClient, type LMStudioConfig } from './lm-studio';
import { OpenAIClientAdapter, type OpenAIClientConfig } from './openai';
import { AnthropicClientAdapter, type AnthropicClientConfig } from './anthropic';

export interface LLMFactoryConfig {
  defaultProvider?: LLMProvider;
  lmStudio?: LMStudioConfig;
  openai?: OpenAIClientConfig;
  anthropic?: AnthropicClientConfig;
}

export class LLMClientFactory {
  private clients: Map<LLMProvider, LLMClient> = new Map();
  private defaultProvider: LLMProvider;

  constructor(config: LLMFactoryConfig = {}) {
    this.defaultProvider = config.defaultProvider || 'lm-studio';

    // 기본 클라이언트 초기화
    this.clients.set('lm-studio', new LMStudioClient(config.lmStudio));
    this.clients.set('openai', new OpenAIClientAdapter(config.openai));
    this.clients.set('anthropic', new AnthropicClientAdapter(config.anthropic));
  }

  /** 기본 제공자 클라이언트 반환 */
  getClient(): LLMClient {
    return this.getClientByProvider(this.defaultProvider);
  }

  /** 특정 제공자 클라이언트 반환 */
  getClientByProvider(provider: LLMProvider): LLMClient {
    const client = this.clients.get(provider);
    if (!client) {
      throw new Error(`LLM provider not found: ${provider}`);
    }
    return client;
  }

  /** 사용 가능한 클라이언트 자동 선택 */
  async getAvailableClient(): Promise<LLMClient> {
    for (const client of this.clients.values()) {
      if (await client.isAvailable()) {
        return client;
      }
    }
    throw new Error('No LLM provider available');
  }

  /** 커스텀 클라이언트 등록 */
  registerClient(client: LLMClient): void {
    this.clients.set(client.provider, client);
  }
}
