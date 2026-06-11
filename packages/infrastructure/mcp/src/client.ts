/**
 * MCP Client
 * Model Context Protocol 클라이언트 (sangfor-mcp 재활용)
 */

import type { MCPTool, MCPRequest, MCPResponse } from './types';

export interface MCPClientConfig {
  serverUrl?: string;
  timeout?: number;
}

export class MCPClient {
  private tools: Map<string, MCPTool> = new Map();
  private serverUrl: string;
  private timeout: number;

  constructor(config: MCPClientConfig = {}) {
    this.serverUrl = config.serverUrl || 'http://localhost:3400';
    this.timeout = config.timeout || 30000;
  }

  registerTool(tool: MCPTool): void {
    this.tools.set(tool.name, tool);
  }

  getTool(name: string): MCPTool | undefined {
    return this.tools.get(name);
  }

  listTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<MCPResponse> {
    const request: MCPRequest = {
      method: 'tools/call',
      params: { name, arguments: args },
    };
    return this.sendRequest(request);
  }

  private async sendRequest(request: MCPRequest): Promise<MCPResponse> {
    try {
      const response = await fetch(`${this.serverUrl}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(this.timeout),
      });
      return await response.json() as MCPResponse;
    } catch (error) {
      return { error: { code: -1, message: String(error) } };
    }
  }
}
