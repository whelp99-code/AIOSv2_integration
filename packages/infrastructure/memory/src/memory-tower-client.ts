import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";

type JsonRpcId = number;

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: JsonRpcId;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: JsonRpcId;
  result?: {
    content?: Array<{
      type?: string;
      text?: string;
    }>;
  };
  error?: JsonRpcError;
}

interface ToolCallParams {
  name: string;
  arguments: Record<string, unknown>;
}

export interface MemoryTowerDocument {
  id?: string;
  title?: string;
  content?: string;
  score?: number;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface MemoryTowerRecord {
  id?: string;
  content?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface MemoryTowerToolResult {
  [key: string]: unknown;
}

export interface MemoryTowerClientConfig {
  userId?: string;
  agentId?: string;
  pythonCommand?: string;
  timeoutMs?: number;
  mem0ServerPath?: string;
  ragServerPath?: string;
}

export class MemoryTowerClient {
  private readonly userId: string;
  private readonly agentId: string;
  private readonly pythonCommand: string;
  private readonly timeoutMs: number;
  private readonly mem0ServerPath: string;
  private readonly ragServerPath: string;

  constructor(config: MemoryTowerClientConfig = {}) {
    this.userId = config.userId ?? "jmpark";
    this.agentId = config.agentId ?? "codex";
    this.pythonCommand = config.pythonCommand ?? "python3";
    this.timeoutMs = config.timeoutMs ?? 30_000;
    this.mem0ServerPath =
      config.mem0ServerPath ??
      join(homedir(), ".hermes", "mcp-servers", "mem0", "server.py");
    this.ragServerPath =
      config.ragServerPath ??
      join(homedir(), ".hermes", "mcp-servers", "rag", "server.py");
  }

  async addMemory(
    content: string,
    metadata: Record<string, unknown> = {},
  ): Promise<MemoryTowerToolResult> {
    return this.callTool(this.mem0ServerPath, "memory_add", {
      content,
      user_id: this.userId,
      agent_id: this.agentId,
      metadata,
    });
  }

  async searchMemory(query: string, limit = 5): Promise<MemoryTowerRecord[]> {
    const result = await this.callTool(this.mem0ServerPath, "memory_search", {
      query,
      user_id: this.userId,
      agent_id: this.agentId,
      limit,
    });

    return normalizeListResult<MemoryTowerRecord>(result, [
      "memories",
      "results",
    ]);
  }

  async listMemories(limit = 50): Promise<MemoryTowerRecord[]> {
    const result = await this.callTool(this.mem0ServerPath, "memory_list", {
      user_id: this.userId,
      limit,
    });

    return normalizeListResult<MemoryTowerRecord>(result, [
      "memories",
      "results",
    ]);
  }

  async addKnowledge(
    title: string,
    content: string,
    source = "codex",
  ): Promise<MemoryTowerToolResult> {
    return this.callTool(this.ragServerPath, "knowledge_add", {
      title,
      content,
      source,
    });
  }

  async searchKnowledge(
    query: string,
    limit = 5,
  ): Promise<MemoryTowerDocument[]> {
    const result = await this.callTool(this.ragServerPath, "knowledge_search", {
      query,
      limit,
    });

    return normalizeListResult<MemoryTowerDocument>(result, [
      "results",
      "documents",
    ]);
  }

  async ingestFile(filePath: string): Promise<MemoryTowerToolResult> {
    return this.callTool(this.ragServerPath, "knowledge_ingest_file", {
      file_path: filePath,
    });
  }

  async ingestDirectory(
    dirPath: string,
    pattern = "*.md",
  ): Promise<MemoryTowerToolResult> {
    return this.callTool(this.ragServerPath, "knowledge_ingest_directory", {
      dir_path: dirPath,
      pattern,
    });
  }

  private async callTool(
    serverPath: string,
    toolName: string,
    argumentsPayload: Record<string, unknown>,
  ): Promise<MemoryTowerToolResult> {
    const requests: JsonRpcRequest[] = [
      {
        jsonrpc: "2.0",
        id: 0,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: {
            name: "aios-memory-tower-client",
            version: "1.0.0",
          },
        },
      },
      {
        jsonrpc: "2.0",
        id: 1,
        method: "tools/call",
        params: {
          name: toolName,
          arguments: argumentsPayload,
        } satisfies ToolCallParams,
      },
    ];

    const response = await this.runServer(serverPath, requests);

    if (response.error) {
      throw new Error(
        `MCP error (${response.error.code}): ${response.error.message}`,
      );
    }

    const text = response.result?.content?.[0]?.text;
    if (!text) {
      return {};
    }

    try {
      return JSON.parse(text) as MemoryTowerToolResult;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to parse MCP content payload: ${message}`, {
        cause: error,
      });
    }
  }

  private runServer(
    serverPath: string,
    requests: JsonRpcRequest[],
  ): Promise<JsonRpcResponse> {
    return new Promise((resolve, reject) => {
      const child = spawn(this.pythonCommand, [serverPath], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";
      const timeout = setTimeout(() => {
        child.kill();
        reject(
          new Error(
            `MCP server timeout after ${this.timeoutMs}ms: ${serverPath}`,
          ),
        );
      }, this.timeoutMs);

      child.stdout.on("data", (chunk: Buffer | string) => {
        stdout += chunk.toString();
      });

      child.stderr.on("data", (chunk: Buffer | string) => {
        stderr += chunk.toString();
      });

      child.on("error", (error) => {
        clearTimeout(timeout);
        reject(error);
      });

      child.on("close", (code) => {
        clearTimeout(timeout);

        if (code !== 0) {
          reject(
            new Error(`MCP server exited with code ${code}: ${stderr.trim()}`),
          );
          return;
        }

        const response = parseLastJsonRpcResponse(stdout);
        resolve(response);
      });

      const payload = `${requests.map((request) => JSON.stringify(request)).join("\n")}\n`;
      child.stdin.write(payload);
      child.stdin.end();
    });
  }
}

function parseLastJsonRpcResponse(output: string): JsonRpcResponse {
  const lines = output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new Error("MCP server returned no output");
  }

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    try {
      return JSON.parse(lines[index]) as JsonRpcResponse;
    } catch {
      continue;
    }
  }

  throw new Error(
    "MCP server output did not contain a valid JSON-RPC response",
  );
}

function normalizeListResult<T extends Record<string, unknown>>(
  result: MemoryTowerToolResult,
  keys: string[],
): T[] {
  if (Array.isArray(result)) {
    return result as T[];
  }

  for (const key of keys) {
    const value = result[key];
    if (Array.isArray(value)) {
      return value as T[];
    }
  }

  return [];
}
