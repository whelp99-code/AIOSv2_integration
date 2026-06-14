import { describe, expect, it, beforeEach } from 'vitest';
import { MCPClient } from '../../packages/infrastructure/mcp/src/client';
import { MCPServerImpl } from '../../packages/infrastructure/mcp/src/server';
import type { MCPTool, MCPRequest, MCPResponse } from '../../packages/infrastructure/mcp/src/types';

describe('MCPServerImpl', () => {
  let server: MCPServerImpl;

  beforeEach(() => {
    server = new MCPServerImpl('test-server');
  });

  it('should initialize with name', () => {
    expect(server.name).toBe('test-server');
    expect(server.tools).toEqual([]);
    expect(server.resources).toEqual([]);
  });

  it('should register tools', () => {
    const tool: MCPTool = {
      name: 'echo',
      description: 'Echoes input',
      inputSchema: { type: 'object', properties: { message: { type: 'string' } } },
    };

    server.registerTool(tool, async (args) => ({ echoed: args.message }));
    expect(server.tools).toHaveLength(1);
    expect(server.tools[0].name).toBe('echo');
  });

  it('should handle tools/list request', async () => {
    const tool: MCPTool = { name: 'test', description: 'test tool', inputSchema: {} };
    server.registerTool(tool, async () => 'result');

    const response = await server.handleRequest({ method: 'tools/list' });
    expect(response.result).toBeDefined();
    const result = response.result as { tools: MCPTool[] };
    expect(result.tools).toHaveLength(1);
    expect(result.tools[0].name).toBe('test');
  });

  it('should handle tools/call request', async () => {
    const tool: MCPTool = { name: 'add', description: 'adds numbers', inputSchema: {} };
    server.registerTool(tool, async (args) => {
      return { sum: (args.a as number) + (args.b as number) };
    });

    const response = await server.handleRequest({
      method: 'tools/call',
      params: { name: 'add', arguments: { a: 3, b: 4 } },
    });

    expect(response.error).toBeUndefined();
    expect(response.result).toEqual({ sum: 7 });
  });

  it('should return error for unknown tool', async () => {
    const response = await server.handleRequest({
      method: 'tools/call',
      params: { name: 'nonexistent', arguments: {} },
    });

    expect(response.error).toBeDefined();
    expect(response.error!.code).toBe(-32601);
    expect(response.error!.message).toContain('nonexistent');
  });

  it('should return error for unknown method', async () => {
    const response = await server.handleRequest({ method: 'unknown/method' });
    expect(response.error).toBeDefined();
    expect(response.error!.code).toBe(-32601);
  });

  it('should add and list resources', () => {
    server.addResource({ uri: 'file:///test', name: 'test-file', mimeType: 'text/plain' });
    expect(server.resources).toHaveLength(1);
  });

  it('should handle resources/list request', async () => {
    server.addResource({ uri: 'file:///a', name: 'a' });
    server.addResource({ uri: 'file:///b', name: 'b' });

    const response = await server.handleRequest({ method: 'resources/list' });
    const result = response.result as { resources: unknown[] };
    expect(result.resources).toHaveLength(2);
  });

  it('should handle handler errors gracefully', async () => {
    const tool: MCPTool = { name: 'fail', description: 'fails', inputSchema: {} };
    server.registerTool(tool, async () => {
      throw new Error('handler error');
    });

    const response = await server.handleRequest({
      method: 'tools/call',
      params: { name: 'fail', arguments: {} },
    });

    expect(response.error).toBeDefined();
    expect(response.error!.code).toBe(-32000);
    expect(response.error!.message).toContain('handler error');
  });
});

describe('MCPClient', () => {
  let client: MCPClient;

  beforeEach(() => {
    client = new MCPClient({ serverUrl: 'http://localhost:9999', timeout: 2000 });
  });

  it('should register and list tools', () => {
    const tool: MCPTool = { name: 'test', description: 'test tool', inputSchema: {} };
    client.registerTool(tool);

    expect(client.listTools()).toHaveLength(1);
    expect(client.getTool('test')).toBeDefined();
    expect(client.getTool('nonexistent')).toBeUndefined();
  });

  it('should register multiple tools', () => {
    client.registerTool({ name: 'a', description: 'a', inputSchema: {} });
    client.registerTool({ name: 'b', description: 'b', inputSchema: {} });
    expect(client.listTools()).toHaveLength(2);
  });

  it('should callTool returns error when server unreachable', async () => {
    const response = await client.callTool('test', { key: 'value' });
    expect(response.error).toBeDefined();
    expect(response.error!.code).toBe(-1);
  });
});
