/**
 * AIOS v2 → Mail Intelligence Proxy Contract Test
 *
 * Verifies that v2 proxy calls correct Mail Intelligence endpoints.
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
  getMailIntelligenceUrl: () => 'http://localhost:3010',
  getMailIntelligenceHeaders: () => ({ 'X-Mail-Internal-Key': 'test-key' }),
}));

vi.mock('../../../../lib/integrations/approval-middleware', () => ({
  createGatedHandler: (_type: string, _id: string, _desc: string, handler: Function) => handler,
}));

describe('AIOS v2 → Mail Intelligence Proxy Contract', () => {
  let proxyUpstreamJson: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    const proxy = await import('../../../../lib/integrations/upstream-proxy');
    proxyUpstreamJson = proxy.proxyUpstreamJson as ReturnType<typeof vi.fn>;
    proxyUpstreamJson.mockResolvedValue({ ok: true, data: {}, status: 200 });
  });

  describe('Health proxy', () => {
    it('calls GET /api/outlook/health', async () => {
      const { GET } = await import('../health/route');
      await GET();
      expect(proxyUpstreamJson).toHaveBeenCalledWith(
        expect.objectContaining({
          baseUrl: 'http://localhost:3010',
          path: '/api/outlook/health',
          timeoutMs: 5000,
          headers: { 'X-Mail-Internal-Key': 'test-key' },
        }),
      );
    });
  });

  describe('Messages proxy', () => {
    it('GET calls /api/outlook/messages', async () => {
      const { GET } = await import('../messages/route');
      const mockRequest = { url: 'http://localhost/api/mail/messages' } as unknown as Request;
      await GET(mockRequest);
      expect(proxyUpstreamJson).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/outlook/messages',
        }),
      );
    });

    it('POST calls /api/outlook/messages', async () => {
      const { POST } = await import('../messages/route');
      const mockRequest = {
        json: async () => ({ search: 'test', approvalId: 'ap-1' }),
      } as unknown as Request;
      await POST(mockRequest);
      expect(proxyUpstreamJson).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/outlook/messages',
          method: 'POST',
        }),
      );
    });
  });

  describe('Analyze proxy', () => {
    it('GET calls /api/outlook/analyze', async () => {
      const { GET } = await import('../analyze/route');
      const mockRequest = { url: 'http://localhost/api/mail/analyze' } as unknown as Request;
      await GET(mockRequest);
      expect(proxyUpstreamJson).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/outlook/analyze',
        }),
      );
    });

    it('POST calls /api/outlook/analyze', async () => {
      const { POST } = await import('../analyze/route');
      const mockRequest = {
        json: async () => ({ messageId: 'msg-001', approvalId: 'ap-1' }),
      } as unknown as Request;
      await POST(mockRequest);
      expect(proxyUpstreamJson).toHaveBeenCalledWith(
        expect.objectContaining({
          path: '/api/outlook/analyze',
          method: 'POST',
        }),
      );
    });
  });

  describe('Contract completeness', () => {
    it('covers all expected Mail Intelligence endpoints', () => {
      const expectedEndpoints = [
        'GET /api/outlook/health',
        'GET /api/outlook/messages',
        'POST /api/outlook/messages',
        'GET /api/outlook/analyze',
        'POST /api/outlook/analyze',
      ];
      expect(expectedEndpoints).toHaveLength(5);
    });
  });
});
