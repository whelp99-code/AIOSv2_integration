/**
 * Anthropic Client Adapter
 * Anthropic Claude API 연동
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  LLMClient,
  LLMMessage,
  LLMCompletionOptions,
  LLMCompletionResult,
  LLMStreamChunk,
} from './types';

export interface AnthropicClientConfig {
  apiKey?: string;
  model?: string;
}

export class AnthropicClientAdapter implements LLMClient {
  readonly provider = 'anthropic' as const;
  readonly providerId = 'anthropic-default';
  private client: Anthropic;
  private defaultModel: string;

  constructor(config: AnthropicClientConfig = {}) {
    this.client = new Anthropic({
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
    });
    this.defaultModel = config.model || 'claude-sonnet-4-20250514';
  }

  async complete(
    messages: LLMMessage[],
    options?: LLMCompletionOptions
  ): Promise<LLMCompletionResult> {
    const systemMsg = messages.find((m) => m.role === 'system');
    const chatMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const response = await this.client.messages.create({
      model: options?.model || this.defaultModel,
      max_tokens: options?.maxTokens ?? 4096,
      temperature: options?.temperature,
      top_p: options?.topP,
      system: systemMsg?.content,
      messages: chatMessages,
    });

    const textBlock = response.content.find(
      (block): block is Extract<(typeof response.content)[number], { type: 'text' }> => block.type === 'text'
    );
    return {
      content: textBlock?.text || '',
      model: response.model,
      provider: 'anthropic',
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
      finishReason: response.stop_reason || 'end_turn',
    };
  }

  async *stream(
    messages: LLMMessage[],
    options?: LLMCompletionOptions
  ): AsyncGenerator<LLMStreamChunk> {
    const systemMsg = messages.find((m) => m.role === 'system');
    const chatMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    const stream = this.client.messages.stream({
      model: options?.model || this.defaultModel,
      max_tokens: options?.maxTokens ?? 4096,
      temperature: options?.temperature,
      system: systemMsg?.content,
      messages: chatMessages,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        const delta = event.delta as { type: string; text?: string };
        if (delta.type === 'text_delta' && delta.text) {
          yield { content: delta.text, done: false };
        }
      }
    }
    yield { content: '', done: true };
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.client.messages.create({
        model: this.defaultModel,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'ping' }],
      });
      return true;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<string[]> {
    // Anthropic API는 모델 목록을 직접 제공하지 않음
    return [this.defaultModel];
  }
}
