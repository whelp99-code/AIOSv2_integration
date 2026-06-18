/**
 * Base Agent
 * 에이전트 기본 클래스 (vibe-coding-os 재활용)
 */

import type { AgentConfig, AgentResult, AgentStep, AgentTool } from './types';
import type { LLMClient, LLMMessage } from '@aios/infrastructure-llm';

export abstract class BaseAgent {
  protected config: AgentConfig;
  protected llm: LLMClient;
  protected tools: Map<string, AgentTool> = new Map();

  constructor(config: AgentConfig, llm: LLMClient) {
    this.config = config;
    this.llm = llm;
  }

  registerTool(tool: AgentTool): void {
    this.tools.set(tool.name, tool);
  }

  async run(userInput: string): Promise<AgentResult> {
    const startTime = Date.now();
    const steps: AgentStep[] = [];
    let totalTokens = { prompt: 0, completion: 0 };
    const maxIter = this.config.maxIterations || 5;

    const messages: LLMMessage[] = [
      { role: 'system', content: this.buildSystemPrompt() },
      { role: 'user', content: userInput },
    ];

    for (let i = 0; i < maxIter; i++) {
      const result = await this.llm.complete(messages, {
        model: this.config.model,
        temperature: this.config.temperature,
      });

      totalTokens.prompt += result.usage.promptTokens;
      totalTokens.completion += result.usage.completionTokens;

      const step = this.parseStep(result.content);
      steps.push(step);

      if (step.action && step.actionInput) {
        const tool = this.tools.get(step.action);
        if (tool) {
          const observation = await tool.execute(step.actionInput);
          step.observation = observation;
          messages.push({ role: 'assistant', content: result.content });
          messages.push({ role: 'user', content: `Observation: ${observation}` });
          continue;
        }
      }

      return {
        output: result.content,
        steps,
        tokenUsage: totalTokens,
        duration: Date.now() - startTime,
      };
    }

    return {
      output: 'Max iterations reached',
      steps,
      tokenUsage: totalTokens,
      duration: Date.now() - startTime,
    };
  }

  protected buildSystemPrompt(): string {
    const toolDescs = Array.from(this.tools.values())
      .map((t) => `- ${t.name}: ${t.description}`)
      .join('\n');

    return `${this.config.systemPrompt}

Available tools:
${toolDescs}

Respond with:
Thought: <your reasoning>
Action: <tool name>
Action Input: <JSON input>
OR
Final Answer: <your response>`;
  }

  protected parseStep(content: string): AgentStep {
    const thoughtMatch = content.match(/Thought:\s*(.*?)(?=Action:|Final Answer:|$)/s);
    const actionMatch = content.match(/Action:\s*(.*?)(?=\n|$)/);
    const inputMatch = content.match(/Action Input:\s*(.*?)(?=\n|$)/s);

    let actionInput: Record<string, unknown> | undefined;
    if (inputMatch?.[1]) {
      try { actionInput = JSON.parse(inputMatch[1].trim()); } catch { /* ignore */ }
    }

    return {
      thought: thoughtMatch?.[1]?.trim() || content,
      action: actionMatch?.[1]?.trim(),
      actionInput,
    };
  }
}
