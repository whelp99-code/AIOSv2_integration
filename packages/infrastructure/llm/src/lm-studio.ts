/**
 * LM Studio Client Adapter
 * LM Studio 로컬 LLM 서버 연동
 */

import OpenAI from 'openai';
import type {
  LLMClient,
  LLMMessage,
  LLMCompletionOptions,
  LLMCompletionResult,
  LLMStreamChunk,
} from './types';

export interface LMStudioConfig {
  baseUrl?: string;
  model?: string;
}

export class LMStudioClient implements LLMClient {
  readonly provider = 'lm-studio' as const;
  private client: OpenAI;
  private defaultModel: string;

  constructor(config: LMStudioConfig = {}) {
    this.client = new OpenAI({
      baseURL: config.baseUrl || process.env.LM_STUDIO_URL || 'http://localhost:1234/v1',
      apiKey: 'lm-studio', // LM Studio는 API 키 불필요
    });
    this.defaultModel = config.model || 'local-model';
  }

  async complete(
    messages: LLMMessage[],
    options?: LLMCompletionOptions
  ): Promise<LLMCompletionResult> {
    const response = await this.client.chat.completions.create({
      model: options?.model || this.defaultModel,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 4096,
      top_p: options?.topP,
      frequency_penalty: options?.frequencyPenalty,
      presence_penalty: options?.presencePenalty,
      stop: options?.stop,
    });

    const choice = response.choices[0];
    return {
      content: choice.message?.content || '',
      model: response.model,
      usage: {
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        totalTokens: response.usage?.total_tokens ?? 0,
      },
      finishReason: choice.finish_reason || 'stop',
    };
  }

  async *stream(
    messages: LLMMessage[],
    options?: LLMCompletionOptions
  ): AsyncGenerator<LLMStreamChunk> {
    const stream = await this.client.chat.completions.create({
      model: options?.model || this.defaultModel,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 4096,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      const done = chunk.choices[0]?.finish_reason !== null;
      yield { content, done };
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
}
