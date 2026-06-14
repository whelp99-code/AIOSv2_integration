/**
 * Docker Sandbox
 * Docker 기반 격리 샌드박스 실행 환경
 */

import { exec as execCb } from 'child_process';
import { promisify } from 'util';
import type { Sandbox, SandboxConfig, SandboxResult } from './types';

const execAsync = promisify(execCb);

export interface DockerSandboxConfig extends SandboxConfig {
  image?: string;
  containerName?: string;
  workDir?: string;
  volumes?: string[];
  envVars?: Record<string, string>;
}

export class DockerSandbox implements Sandbox {
  private config: Required<Omit<DockerSandboxConfig, 'allowedCommands' | 'envVars'>> & {
    allowedCommands: string[];
    envVars: Record<string, string>;
  };
  private containerId: string | null = null;
  private isRunning = false;

  constructor(config: DockerSandboxConfig = {}) {
    this.config = {
      image: config.image || 'node:20-slim',
      containerName: config.containerName || `sandbox_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      workDir: config.workDir || '/workspace',
      volumes: config.volumes || [],
      timeout: config.timeout || 30000,
      memoryLimit: config.memoryLimit || '512m',
      networkAccess: config.networkAccess ?? false,
      allowedCommands: config.allowedCommands || ['node', 'python3'],
      envVars: config.envVars || {},
    };
  }

  async start(): Promise<void> {
    if (this.isRunning) return;

    const args = [
      'run', '-d',
      '--name', this.config.containerName,
      `--memory=${this.config.memoryLimit}`,
      `--workdir=${this.config.workDir}`,
    ];

    if (!this.config.networkAccess) {
      args.push('--network=none');
    }

    for (const vol of this.config.volumes) {
      args.push('-v', vol);
    }

    for (const [key, value] of Object.entries(this.config.envVars)) {
      args.push('-e', `${key}=${value}`);
    }

    args.push(this.config.image, 'sleep', 'infinity');

    const { stdout } = await execAsync(`docker ${args.join(' ')}`, {
      timeout: this.config.timeout,
    });

    this.containerId = stdout.trim();
    this.isRunning = true;
  }

  async execute(command: string, args: string[] = []): Promise<SandboxResult> {
    if (!this.isRunning) {
      await this.start();
    }

    const startTime = Date.now();
    const fullCommand = ['exec', this.config.containerName!, command, ...args];

    try {
      const { stdout, stderr } = await execAsync(`docker ${fullCommand.join(' ')}`, {
        timeout: this.config.timeout,
        maxBuffer: 10 * 1024 * 1024,
      });

      return {
        exitCode: 0,
        stdout,
        stderr,
        duration: Date.now() - startTime,
      };
    } catch (error: unknown) {
      const err = error as { code?: number; stdout?: string; stderr?: string };
      return {
        exitCode: err.code ?? 1,
        stdout: err.stdout || '',
        stderr: err.stderr || String(error),
        duration: Date.now() - startTime,
      };
    }
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    if (!this.isRunning) {
      await this.start();
    }

    const encoded = Buffer.from(content).toString('base64');
    const fullCommand = [
      'exec', this.config.containerName!,
      'sh', '-c', `echo '${encoded}' | base64 -d > ${filePath}`,
    ];

    await execAsync(`docker ${fullCommand.join(' ')}`, {
      timeout: this.config.timeout,
    });
  }

  async readFile(filePath: string): Promise<string> {
    if (!this.isRunning) {
      await this.start();
    }

    const fullCommand = [
      'exec', this.config.containerName!,
      'cat', filePath,
    ];

    const { stdout } = await execAsync(`docker ${fullCommand.join(' ')}`, {
      timeout: this.config.timeout,
    });

    return stdout;
  }

  async cleanup(): Promise<void> {
    if (this.containerId) {
      try {
        await execAsync(`docker rm -f ${this.config.containerName}`, {
          timeout: 10000,
        });
      } catch {
        // Best-effort cleanup
      }
      this.containerId = null;
      this.isRunning = false;
    }
  }

  getContainerName(): string {
    return this.config.containerName;
  }

  getIsRunning(): boolean {
    return this.isRunning;
  }
}
