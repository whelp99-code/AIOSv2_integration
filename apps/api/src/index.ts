/**
 * AIOS API Server
 * Express + tRPC API 서버
 */

import express from 'express';
import cors from 'cors';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './routers';
import { createContext } from './context';
import { authMiddleware, errorHandler, rateLimiter } from './middleware';

const app = express();
const PORT = process.env.API_PORT || 3200;

// Middleware
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3300', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(rateLimiter({ windowMs: 60000, maxRequests: 200 }));
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

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '0.1.0', timestamp: new Date().toISOString() });
});

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 AIOS API Server running on port ${PORT}`);
  console.log(`   tRPC: http://localhost:${PORT}/trpc`);
  console.log(`   Health: http://localhost:${PORT}/health`);
});

export type { AppRouter } from './routers';
