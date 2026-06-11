/**
 * MCP Server
 * Model Context Protocol 서버 (sangfor-mcp 재활용)
 */

import type { MCPServer, MCPTool, MCPResource, MCPRequest, MCPResponse } from './types';

type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;

export class MCPServerImpl implements MCPServer {
  name: string;
  tools: MCPTool[] = [];
  resources: MCPResource[] = [];
  private handlers: Map<string, ToolHandler> = new Map();

  constructor(name: string) {
    this.name = name;
  }

  registerTool(tool: MCPTool, handler: ToolHandler): void {
    this.tools.push(tool);
    this.handlers.set(tool.name, handler);
  }

  addResource(resource: MCPResource): void {
    this.resources.push(resource);
  }

  async handleRequest(request: MCPRequest): Promise<MCPResponse> {
    try {
      switch (request.method) {
        case 'tools/list':
          return { result: { tools: this.tools } };
        case 'tools/call': {
          const { name, arguments: args } = request.params as { name: string; arguments: Record<string, unknown> };
          const handler = this.handlers.get(name);
          if (!handler) return { error: { code: -32601, message: `Tool not found: ${name}` } };
          const result = await handler(args || {});
          return { result };
        }
        case 'resources/list':
          return { result: { resources: this.resources } };
        default:
          return { error: { code: -32601, message: `Method not found: ${request.method}` } };
      }
    } catch (error) {
      return { error: { code: -32000, message: String(error) } };
    }
  }
}
