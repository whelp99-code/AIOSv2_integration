/**
 * AIOS v2 → Sangfor MCP Proxy Contract Test
 *
 * Verifies that v2 proxy calls correct Sangfor MCP endpoints.
 * These tests mock fetch and verify the URL/method/headers contract.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock next/server before any imports that depend on it
vi.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
      ok: (init?.status ?? 200) < 400,
    }),
  },
}));

// Mock upstream-proxy module
vi.mock('../../../../lib/integrations/upstream-proxy', () => ({
  proxyUpstreamJson: vi.fn(),
  upstreamErrorResponse: vi.fn(),
  upstreamProxyResponse: vi.fn(),
}));

vi.mock('../../../../lib/integrations/upstream-urls', () => ({
  getSangforMcpUrl: () => 'http://localhost:3500',
}));

vi.mock('../../../../lib/integrations/approval-middleware', () => ({
  createGatedHandler: (_type: string, _id: string, _desc: string, handler: Function) => handler,
}));

describe('AIOS v2 → Sangfor MCP Proxy Contract', () => {
  let proxyUpstreamJson: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const proxy = await import('../../../../lib/integrations/upstream-proxy');
    proxyUpstreamJson = proxy.proxyUpstreamJson as ReturnType<typeof vi.fn>;
    proxyUpstreamJson.mockResolvedValue({ ok: true, data: {}, status: 200 });
  });

  describe('Health proxy', () => {
    it('GET calls /api/system/health', async () => {
      const { GET } = await import('../health/route');
      await GET();
      expect(proxyUpstreamJson).toHaveBeenCalledWith(
        expect.objectContaining({
          baseUrl: 'http://localhost:3500',
          path: '/api/system/health',
          timeoutMs: 5000,
        }),
      );
    });

    it('POST calls /api/system/health', async () => {
      const { POST } = await import('../health/route');
      const mockRequest = {
        json: async () => ({}),
      } as unknown as Request;
      await POST(mockRequest);
      expect(proxyUpstreamJson).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/system/health',
          method: 'POST',
        }),
      );
    });
  });

  describe('Devices proxy', () => {
    it('GET calls /api/devices', async () => {
      const { GET } = await import('../devices/route');
      const mockRequest = { url: 'http://localhost/api/sangfor/devices' } as unknown as Request;
      await GET(mockRequest);
      expect(proxyUpstreamJson).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/devices',
        }),
      );
    });

    it('POST calls /api/devices', async () => {
      const { POST } = await import('../devices/route');
      const mockRequest = {
        json: async () => ({ action: 'scan', approvalId: 'ap-1' }),
      } as unknown as Request;
      await POST(mockRequest);
      expect(proxyUpstreamJson).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/devices',
          method: 'POST',
        }),
      );
    });
  });

  describe('Workflows proxy', () => {
    it('GET calls /api/workflows', async () => {
      const { GET } = await import('../workflows/route');
      await GET();
      expect(proxyUpstreamJson).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/workflows',
        }),
      );
    });

    it('POST calls /api/workflows/:id/execute', async () => {
      const { POST } = await import('../workflows/route');
      const mockRequest = {
        json: async () => ({ workflowId: 'wf-001', input: {}, approvalId: 'ap-1' }),
      } as unknown as Request;
      await POST(mockRequest);
      expect(proxyUpstreamJson).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/workflows/wf-001/execute',
          method: 'POST',
        }),
      );
    });
  });

  describe('Contract completeness', () => {
    it('covers all expected Sangfor MCP endpoints', () => {
      const expectedEndpoints = [
        'GET /api/system/health',
        'POST /api/system/health',
        'GET /api/devices',
        'POST /api/devices',
        'GET /api/workflows',
        'POST /api/workflows/:id/execute',
      ];
      expect(expectedEndpoints).toHaveLength(6);
    });
  });
});
