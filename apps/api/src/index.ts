/**
 * AIOS API Server
 * Express + tRPC API 서버
 */

import express, { type Express } from 'express';
import cors from 'cors';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { fileURLToPath } from 'node:url';
import { probeIntegrationTarget, resolveAiosWorkspaceRoot } from '@aios/infrastructure';
import { getIntegrationTarget } from '@aios/shared';
import { appRouter } from './routers';
import { createContext } from './context';
import { authMiddleware, errorHandler, rateLimiter } from './middleware';

const PORT = process.env.API_PORT || 3200;

export function createApp(): Express {
  const app = express();

  // Middleware
  app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3110', credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(rateLimiter({ windowMs: 60000, maxRequests: 200 }));

  // Health check (before auth middleware, so it's always accessible)
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', version: '0.1.0', timestamp: new Date().toISOString() });
  });

  // Also expose health under /api path for F-aios-v3 proxy compatibility
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', version: '0.1.0', timestamp: new Date().toISOString() });
  });

  // whelp99 health bridge — filesystem probe for MCP extension
  app.get('/api/whelp99/health', async (_req, res) => {
    try {
      const target = getIntegrationTarget('whelp99-code-sangfor-engineer-mcp');
      const result = await probeIntegrationTarget(target, {
        workspaceRoot: resolveAiosWorkspaceRoot(),
      });
      res.json({
        id: result.id,
        status: result.status,
        upstream: result.upstream,
        details: result.details ?? target.readinessNote,
      });
    } catch (error) {
      res.status(500).json({
        id: 'whelp99-code-sangfor-engineer-mcp',
        status: 'unreachable',
        upstream: '',
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Slack status — env-based detection
  app.get('/api/slack/status', (_req, res) => {
    const hasWebhook = Boolean(process.env.SLACK_WEBHOOK_URL);
    const hasBotToken = Boolean(process.env.SLACK_BOT_TOKEN);
    const connected = hasWebhook || hasBotToken;
    res.json({
      connected,
      hasWebhook,
      hasBotToken,
      status: connected ? 'ok' : 'unreachable',
    });
  });

  // Auth middleware for other /api routes
  app.use('/api', authMiddleware);

  // tRPC
  app.use(
    '/trpc',
    createExpressMiddleware({
      router: appRouter,
      createContext,
      onError: ({ error }) => console.error('tRPC Error:', error),
    })
  );

  // Error handler
  app.use(errorHandler);

  return app;
}

const isEntrypoint = process.argv[1] === fileURLToPath(import.meta.url);

if (isEntrypoint) {
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`🚀 AIOS API Server running on port ${PORT}`);
    console.log(`   tRPC: http://localhost:${PORT}/trpc`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log(`   Health (api): http://localhost:${PORT}/api/health`);
  });
}

export type { AppRouter } from './routers';
