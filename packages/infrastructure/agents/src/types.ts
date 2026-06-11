export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  model?: string;
  temperature?: number;
  maxIterations?: number;
}

export interface AgentStep {
  thought: string;
  action?: string;
  actionInput?: Record<string, unknown>;
  observation?: string;
}

export interface AgentResult {
  output: string;
  steps: AgentStep[];
  tokenUsage: { prompt: number; completion: number };
  duration: number;
}

export interface AgentTool {
  name: string;
  description: string;
  execute(input: Record<string, unknown>): Promise<string>;
}
