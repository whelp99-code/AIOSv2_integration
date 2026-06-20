/**
 * OpenRouter Client Adapter
 * OpenRouter API 연동 - 100+ 모델 접근
 */

import OpenAI from 'openai';
import type {
  LLMClient,
  LLMMessage,
  LLMCompletionOptions,
  LLMCompletionResult,
  LLMStreamChunk,
} from './types';

export interface OpenRouterClientConfig {
  apiKey?: string;
  model?: string;
  /** 사이트 이름 (OpenRouter 랭킹에 표시) */
  siteName?: string;
  /** 리퍼러 URL */
  referer?: string;
}

export class OpenRouterClientAdapter implements LLMClient {
  readonly provider = 'openrouter' as const;
  readonly providerId: string;
  private client: OpenAI;
  private defaultModel: string;
  private siteName?: string;
  private referer?: string;

  constructor(config: OpenRouterClientConfig = {}) {
    this.providerId = config.siteName ?? 'aios-v3';
    this.siteName = config.siteName ?? 'AIOS v3';
    this.referer = config.referer;

    this.client = new OpenAI({
      apiKey: config.apiKey || process.env.OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': this.referer ?? 'https://aios.dev',
        'X-Title': this.siteName,
      },
    });

    this.defaultModel = config.model ?? 'anthropic/claude-sonnet-4';
  }

  async complete(
    messages: LLMMessage[],
    options?: LLMCompletionOptions
  ): Promise<LLMCompletionResult> {
    const startTime = Date.now();
    const model = options?.model ?? this.defaultModel;

    const response = await this.client.chat.completions.create({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 4096,
      top_p: options?.topP,
      frequency_penalty: options?.frequencyPenalty,
      presence_penalty: options?.presencePenalty,
      stop: options?.stop,
    });

    const choice = response.choices[0];
    const latencyMs = Date.now() - startTime;

    return {
      content: choice.message?.content || '',
      model: response.model ?? model,
      provider: 'openrouter',
      providerId: this.providerId,
      usage: {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
      },
      finishReason: choice.finish_reason || 'stop',
      latencyMs,
    };
  }

  async *stream(
    messages: LLMMessage[],
    options?: LLMCompletionOptions
  ): AsyncGenerator<LLMStreamChunk> {
    const model = options?.model ?? this.defaultModel;

    const stream = await this.client.chat.completions.create({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 4096,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      const done = chunk.choices[0]?.finish_reason !== null;
      yield { content, done, model: chunk.model ?? model, provider: 'openrouter' };
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await this.client.models.list();
      return response.data.map((m) => m.id);
    } catch {
      return [
        'anthropic/claude-sonnet-4',
        'anthropic/claude-opus-4',
        'openai/gpt-4o',
        'google/gemini-2.0-flash',
        'deepseek/deepseek-chat',
        'meta-llama/llama-3.3-70b',
        'mistralai/mixtral-8x7b',
        'xiaomi/mimo-v2-pro',
      ];
    }
  }

  /**
   * OpenRouter 특화: 가격 정보 조회
   */
  async getPricing(modelId: string): Promise<{ input: number; output: number } | null> {
    try {
      const response = await fetch(`https://openrouter.ai/api/v1/models/${modelId}`);
      if (!response.ok) return null;

      const data = await response.json();
      return {
        input: data.pricing?.prompt ? parseFloat(data.pricing.prompt) * 1e6 : 0,
        output: data.pricing?.completion ? parseFloat(data.pricing.completion) * 1e6 : 0,
      };
    } catch {
      return null;
    }
  }
}
