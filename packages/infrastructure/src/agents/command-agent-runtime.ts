/**
 * Command-backed Agent Runtime
 * Cursor/opencode CLI를 실제 실행 가능한 런타임으로 감싼다.
 */

import { spawn } from 'node:child_process';
import type { AgentJob, AgentJobCreationRequest, AgentJobUpdateRequest, AgentType, JobOutput } from '@aios/domain';

export interface CommandAgentRuntimeConfig {
  agentType: AgentType;
  command: string;
  args?: string[];
  cwd?: string;
  timeoutMs?: number;
  environment?: NodeJS.ProcessEnv;
  argsBuilder?: (request: AgentJobCreationRequest) => string[];
}

export interface CommandAgentStatus {
  agentType: AgentType;
  status: 'idle' | 'busy' | 'error' | 'offline';
  currentJob?: string;
  uptime: number;
  lastActivity: Date;
}

export class CommandAgentRuntime {
  readonly agentType: AgentType;
  private readonly startedAt = Date.now();
  private currentJobId?: string;
  private lastActivity = new Date();

  constructor(private readonly config: CommandAgentRuntimeConfig) {
    this.agentType = config.agentType;
  }

  async initialize(): Promise<void> {
    this.lastActivity = new Date();
  }

  async shutdown(): Promise<void> {
    this.currentJobId = undefined;
    this.lastActivity = new Date();
  }

  async executeJob(request: AgentJobCreationRequest): Promise<AgentJob> {
    const startedAt = new Date();
    this.currentJobId = `${this.agentType}-${Date.now()}`;
    this.lastActivity = startedAt;

    try {
      const { stdout, stderr, duration, exitCode } = await runCommand({
        command: this.config.command,
        args: this.getArgs(request),
        cwd: this.config.cwd,
        timeoutMs: this.config.timeoutMs ?? 120_000,
        env: this.config.environment,
      });

      this.currentJobId = undefined;
      this.lastActivity = new Date();

      return {
        id: `${this.agentType}-job-${Date.now()}`,
        taskId: request.taskId,
        agentType: this.agentType,
        status: 'completed',
        startedAt,
        completedAt: new Date(),
        input: request.input,
        output: {
          result: stdout.trim(),
          artifacts: [
            {
              type: 'comment',
              content: stdout.trim(),
              metadata: {
                stderr: stderr.trim(),
                command: this.config.command,
                exitCode,
              },
            },
          ],
          duration,
        },
        metadata: {
          command: this.config.command,
          args: this.getArgs(request),
          exitCode,
          stderr: stderr.trim(),
        },
      };
    } catch (error) {
      this.currentJobId = undefined;
      this.lastActivity = new Date();

      return {
        id: `${this.agentType}-job-${Date.now()}`,
        taskId: request.taskId,
        agentType: this.agentType,
        status: 'failed',
        startedAt,
        completedAt: new Date(),
        input: request.input,
        error: error instanceof Error ? error.message : String(error),
        metadata: {
          command: this.config.command,
          args: this.getArgs(request),
        },
      };
    }
  }

  async updateJobStatus(jobId: string, request: AgentJobUpdateRequest): Promise<AgentJob> {
    const output = request.output ?? createEmptyOutput();
    return {
      id: jobId,
      taskId: '',
      agentType: this.agentType,
      status: request.status ?? 'pending',
      startedAt: new Date(),
      completedAt: request.status === 'completed' || request.status === 'failed' ? new Date() : undefined,
      input: {
        task: '',
        context: {},
        constraints: [],
      },
      output,
      error: request.error,
      metadata: {},
    };
  }

  async collectResult(job: AgentJob): Promise<JobOutput> {
    return job.output ?? createEmptyOutput();
  }

  async getStatus(): Promise<CommandAgentStatus> {
    const available = await this.isAvailable();
    return {
      agentType: this.agentType,
      status: available ? (this.currentJobId ? 'busy' : 'idle') : 'offline',
      currentJob: this.currentJobId,
      uptime: Date.now() - this.startedAt,
      lastActivity: this.lastActivity,
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      await runCommand({
        command: 'sh',
        args: ['-lc', `command -v ${shellEscape(this.config.command)}`],
        timeoutMs: 5_000,
      });
      return true;
    } catch {
      return false;
    }
  }

  private getArgs(request: AgentJobCreationRequest): string[] {
    if (this.config.argsBuilder) {
      return this.config.argsBuilder(request);
    }
    return this.config.args ?? [];
  }
}

export function createOpencodeRuntime(cwd = process.cwd()): CommandAgentRuntime {
  return new CommandAgentRuntime({
    agentType: 'opencode',
    command: process.env.OPENCODE_COMMAND || 'opencode',
    cwd,
    argsBuilder: (request) => ['run', request.input.task],
  });
}

export function createCursorRuntime(cwd = process.cwd()): CommandAgentRuntime {
  const command = process.env.CURSOR_AGENT_COMMAND || 'cursor-agent';
  return new CommandAgentRuntime({
    agentType: 'manual',
    command,
    cwd,
    argsBuilder: (request) => [request.input.task],
  });
}

function createEmptyOutput(): JobOutput {
  return {
    result: null,
    artifacts: [],
    duration: 0,
  };
}

function runCommand(input: {
  command: string;
  args: string[];
  cwd?: string;
  timeoutMs: number;
  env?: NodeJS.ProcessEnv;
}): Promise<{ stdout: string; stderr: string; duration: number; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const child = spawn(input.command, input.args, {
      cwd: input.cwd,
      env: {
        ...process.env,
        ...(input.env ?? {}),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`Command timed out after ${input.timeoutMs}ms: ${input.command}`));
    }, input.timeoutMs);

    child.stdout.on('data', (chunk: Buffer | string) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk: Buffer | string) => {
      stderr += chunk.toString();
    });

    child.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        reject(new Error(stderr.trim() || `Command failed with exit code ${code}: ${input.command}`));
        return;
      }

      resolve({
        stdout,
        stderr,
        duration: Date.now() - startedAt,
        exitCode: code ?? 0,
      });
    });
  });
}

function shellEscape(value: string): string {
  return value.replace(/'/g, `'\\''`);
}
