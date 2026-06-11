/**
 * Process Sandbox
 * 안전한 코드 실행 샌드박스 (F-aios-v3 재활용)
 */

import { exec } from 'child_process';
import type { Sandbox, SandboxConfig, SandboxResult } from './types';

export class ProcessSandbox implements Sandbox {
  private config: SandboxConfig;

  constructor(config: SandboxConfig = {}) {
    this.config = {
      timeout: config.timeout || 30000,
      networkAccess: config.networkAccess ?? false,
      allowedCommands: config.allowedCommands || ['node', 'python3', 'echo'],
    };
  }

  async execute(command: string, args: string[] = []): Promise<SandboxResult> {
    const startTime = Date.now();
    const fullCommand = `${command} ${args.join(' ')}`;

    return new Promise((resolve) => {
      exec(fullCommand, { timeout: this.config.timeout }, (error, stdout, stderr) => {
        resolve({
          exitCode: error?.code ?? 0,
          stdout,
          stderr,
          duration: Date.now() - startTime,
        });
      });
    });
  }

  async writeFile(_path: string, _content: string): Promise<void> {
    throw new Error('Not implemented in process sandbox');
  }

  async readFile(_path: string): Promise<string> {
    throw new Error('Not implemented in process sandbox');
  }

  async cleanup(): Promise<void> {
    // Cleanup resources
  }
}
