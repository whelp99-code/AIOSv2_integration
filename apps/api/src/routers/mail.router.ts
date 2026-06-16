/**
 * Mail Router — proxies to mail-intelligence analyze API.
 */

import { z } from 'zod';
import { router, protectedProcedure } from './trpc';

const MAIL_INTELLIGENCE_URL = process.env.MAIL_INTELLIGENCE_URL || 'http://localhost:3010';

async function fetchAnalyze(query = 'top=50&sync=cache') {
  const response = await fetch(`${MAIL_INTELLIGENCE_URL}/api/outlook/analyze?${query}`, {
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    return { mails: [], total: 0, threadGroups: [], connected: false };
  }
  const data = await response.json();
  return {
    mails: data.messages || [],
    total: data.sync?.totalCached ?? (data.messages?.length || 0),
    threadGroups: data.threadGroups || [],
    connected: Boolean(data.connected),
    threadGrouping: data.threadGrouping,
    sync: data.sync,
  };
}

export const mailRouter = router({
  list: protectedProcedure
    .input(z.object({ limit: z.number().optional().default(50), offset: z.number().optional().default(0) }).optional())
    .query(async ({ input }) => {
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;
      const data = await fetchAnalyze(`top=${limit}&sync=cache`);
      const mails = (data.mails as unknown[]).slice(offset, offset + limit);
      return { mails, total: data.total, limit, offset, threadGroups: data.threadGroups };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const data = await fetchAnalyze('top=100&sync=cache');
      const mail = (data.mails as Array<{ id: string }>).find((m) => m.id === input.id);
      return mail || { id: input.id, subject: '', from: '', body: '', status: 'unread' };
    }),

  analyze: protectedProcedure
    .input(z.object({ mailId: z.string().optional() }).optional())
    .mutation(async () => {
      const data = await fetchAnalyze('top=50&sync=auto');
      return {
        threadGroups: data.threadGroups,
        threadGrouping: data.threadGrouping,
        sync: data.sync,
        connected: data.connected,
      };
    }),

  archive: protectedProcedure
    .input(z.object({ mailId: z.string(), reason: z.string().optional(), approvalId: z.string().optional() }))
    .mutation(async ({ input }) => {
      return { success: true, mailId: input.mailId, note: 'Use web /api/mail/read with approval gate' };
    }),

  markAsRead: protectedProcedure
    .input(z.object({ mailId: z.string(), approvalId: z.string().optional() }))
    .mutation(async ({ input }) => {
      return { success: true, mailId: input.mailId, note: 'Use web /api/mail/read with approval gate' };
    }),

  stats: protectedProcedure.query(async () => {
    const data = await fetchAnalyze('top=1&sync=cache');
    const mails = data.mails as Array<{ isRead?: boolean; aiAnalysis?: unknown }>;
    return {
      total: data.total,
      unread: mails.filter((m) => !m.isRead).length,
      analyzed: data.threadGroups?.length || 0,
      connected: data.connected,
    };
  }),
});
