/** MCP Protocol Types (sangfor-mcp 재활용) */
export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface MCPResource {
  uri: string;
  name: string;
  mimeType?: string;
}

export interface MCPRequest {
  method: string;
  params?: Record<string, unknown>;
}

export interface MCPResponse {
  result?: unknown;
  error?: { code: number; message: string };
}

export interface MCPServer {
  name: string;
  tools: MCPTool[];
  resources: MCPResource[];
  handleRequest(request: MCPRequest): Promise<MCPResponse>;
}
