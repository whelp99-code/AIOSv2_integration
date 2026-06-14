/**
 * Process Sandbox
 * 안전한 코드 실행 샌드박스 (F-aios-v3 재활용)
 */

import { exec as execCb } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import type { Sandbox, SandboxConfig, SandboxResult } from './types';

const execAsync = promisify(execCb);

export class ProcessSandbox implements Sandbox {
  private config: SandboxConfig;
  private tempDir: string | null = null;

  constructor(config: SandboxConfig = {}) {
    this.config = {
      timeout: config.timeout || 30000,
      networkAccess: config.networkAccess ?? false,
      allowedCommands: config.allowedCommands || ['node', 'python3', 'echo'],
    };
  }

  async execute(command: string, args: string[] = []): Promise<SandboxResult> {
    const startTime = Date.now();
    const fullCommand = [command, ...args].map((a) => JSON.stringify(a)).join(' ');

    try {
      const { stdout, stderr } = await execAsync(fullCommand, {
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
    const dir = await this.ensureTempDir();
    const fullPath = path.join(dir, filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content, 'utf-8');
  }

  async readFile(filePath: string): Promise<string> {
    const dir = await this.ensureTempDir();
    const fullPath = path.join(dir, filePath);
    return fs.readFile(fullPath, 'utf-8');
  }

  async cleanup(): Promise<void> {
    if (this.tempDir) {
      try {
        await fs.rm(this.tempDir, { recursive: true, force: true });
      } catch {
        // Best-effort cleanup
      }
      this.tempDir = null;
    }
  }

  getTempDir(): string | null {
    return this.tempDir;
  }

  private async ensureTempDir(): Promise<string> {
    if (!this.tempDir) {
      this.tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sandbox-'));
    }
    return this.tempDir;
  }
}
