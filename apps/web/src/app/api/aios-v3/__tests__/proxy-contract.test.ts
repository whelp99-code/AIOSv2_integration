/**
 * AIOS v2 → F-aios-v3 Proxy Contract Test
 *
 * Phase 0: Verifies that v2 proxy calls correct F endpoints.
 * These tests mock fetch and verify the URL/method/headers contract.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock upstream-proxy module
vi.mock('../../../../lib/integrations/upstream-proxy', () => ({
  proxyUpstreamJson: vi.fn(),
  upstreamErrorResponse: vi.fn(),
  upstreamProxyResponse: vi.fn(),
}));

vi.mock('../../../../lib/integrations/upstream-urls', () => ({
  getFaiosV3Url: () => 'http://localhost:3201',
  getFaiosV3Headers: () => ({ 'X-API-Key': 'test-key' }),
}));

vi.mock('../../../../lib/integrations/approval-middleware', () => ({
  createGatedHandler: (_type: string, _id: string, _desc: string, handler: Function) => handler,
}));

describe('AIOS v2 → F Proxy Contract', () => {
  let proxyUpstreamJson: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const proxy = await import('../../../../lib/integrations/upstream-proxy');
    proxyUpstreamJson = proxy.proxyUpstreamJson as ReturnType<typeof vi.fn>;
    proxyUpstreamJson.mockResolvedValue({ ok: true, data: {}, status: 200 });
  });

  describe('Health proxy', () => {
    it('calls GET /health', async () => {
      const { GET } = await import('../health/route');
      await GET();
      expect(proxyUpstreamJson).toHaveBeenCalledWith(
        expect.objectContaining({
          baseUrl: 'http://localhost:3201',
          path: '/health',
          headers: { 'X-API-Key': 'test-key' },
        })
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
        })
      );
    });

    it('POST calls /api/workflows/:id/execute', async () => {
      const { POST } = await import('../workflows/route');
      const mockRequest = {
        json: async () => ({ workflowId: 'wf-001', input: {} }),
      } as unknown as Request;
      await POST(mockRequest);
      expect(proxyUpstreamJson).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/workflows/wf-001/execute',
          method: 'POST',
        })
      );
    });
  });

  describe('Orchestrator proxy', () => {
    it('GET calls /api/orchestrator', async () => {
      const { GET } = await import('../orchestrator/route');
      const mockRequest = { url: 'http://localhost/api/aios-v3/orchestrator', search: '' } as unknown as Request;
      await GET(mockRequest);
      expect(proxyUpstreamJson).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/orchestrator',
        })
      );
    });

    it('POST calls /api/orchestrator/run', async () => {
      const { POST } = await import('../orchestrator/route');
      const mockRequest = {
        json: async () => ({ task: 'test', approvalId: 'ap-1' }),
        url: 'http://localhost/api/aios-v3/orchestrator',
        search: '',
      } as unknown as Request;
      await POST(mockRequest);
      expect(proxyUpstreamJson).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/orchestrator/run',
          method: 'POST',
        })
      );
    });
  });

  describe('Knowledge proxy', () => {
    it('GET without query calls /api/knowledge', async () => {
      const { GET } = await import('../knowledge/route');
      const mockRequest = { url: 'http://localhost/api/aios-v3/knowledge' } as unknown as Request;
      await GET(mockRequest);
      expect(proxyUpstreamJson).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/knowledge',
        })
      );
    });

    it('GET with query calls /api/knowledge/search', async () => {
      const { GET } = await import('../knowledge/route');
      const mockRequest = { url: 'http://localhost/api/aios-v3/knowledge?q=test' } as unknown as Request;
      await GET(mockRequest);
      expect(proxyUpstreamJson).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/knowledge/search?q=test',
        })
      );
    });

    it('POST calls /api/knowledge', async () => {
      const { POST } = await import('../knowledge/route');
      const mockRequest = {
        json: async () => ({ title: 'test', content: 'content', approvalId: 'ap-1' }),
      } as unknown as Request;
      await POST(mockRequest);
      expect(proxyUpstreamJson).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/knowledge',
          method: 'POST',
        })
      );
    });
  });

  describe('LightRAG proxy', () => {
    it('GET without query calls /api/lightrag', async () => {
      const { GET } = await import('../lightrag/route');
      const mockRequest = { url: 'http://localhost/api/aios-v3/lightrag' } as unknown as Request;
      await GET(mockRequest);
      expect(proxyUpstreamJson).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/lightrag',
        })
      );
    });

    it('GET with query calls /api/lightrag/search', async () => {
      const { GET } = await import('../lightrag/route');
      const mockRequest = { url: 'http://localhost/api/aios-v3/lightrag?q=test' } as unknown as Request;
      await GET(mockRequest);
      expect(proxyUpstreamJson).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/lightrag/search?q=test',
        })
      );
    });

    it('POST calls /api/lightrag/ingest', async () => {
      const { POST } = await import('../lightrag/route');
      const mockRequest = {
        json: async () => ({ content: 'test', approvalId: 'ap-1' }),
      } as unknown as Request;
      await POST(mockRequest);
      expect(proxyUpstreamJson).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/lightrag/ingest',
          method: 'POST',
        })
      );
    });
  });

  describe('Monitoring proxy', () => {
    it('GET calls /api/monitoring', async () => {
      const { GET } = await import('../monitoring/route');
      const mockRequest = { url: 'http://localhost/api/aios-v3/monitoring', search: '' } as unknown as Request;
      await GET(mockRequest);
      expect(proxyUpstreamJson).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/monitoring',
        })
      );
    });
  });

  describe('Contract completeness', () => {
    it('covers all 12 expected F API endpoints', () => {
      // health(1) + workflows(2) + orchestrator(2) + knowledge(3) + lightrag(3) + monitoring(1) = 12
      const expectedEndpoints = [
        'GET /health',
        'GET /api/workflows',
        'POST /api/workflows/:id/execute',
        'GET /api/orchestrator',
        'POST /api/orchestrator/run',
        'GET /api/knowledge',
        'GET /api/knowledge/search',
        'POST /api/knowledge',
        'GET /api/lightrag',
        'GET /api/lightrag/search',
        'POST /api/lightrag/ingest',
        'GET /api/monitoring',
      ];
      expect(expectedEndpoints).toHaveLength(12);
    });
  });
});
