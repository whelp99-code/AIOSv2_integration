export interface SandboxConfig {
  timeout?: number;
  memoryLimit?: string;
  networkAccess?: boolean;
  allowedCommands?: string[];
}

export interface SandboxResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
}

export interface Sandbox {
  execute(command: string, args?: string[]): Promise<SandboxResult>;
  writeFile(path: string, content: string): Promise<void>;
  readFile(path: string): Promise<string>;
  cleanup(): Promise<void>;
}
