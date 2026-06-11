/**
 * Mail Router
 * 메일 tRPC 라우터
 */

import { z } from 'zod';
import { router, protectedProcedure } from './trpc';

export const mailRouter = router({
  list: protectedProcedure
    .input(z.object({ limit: z.number().optional().default(50), offset: z.number().optional().default(0) }).optional())
    .query(async ({ input }) => {
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;
      return { mails: [], total: 0, limit, offset };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return { id: input.id, subject: '', from: '', body: '', status: 'unread' };
    }),

  analyze: protectedProcedure
    .input(z.object({ mailId: z.string() }))
    .mutation(async ({ input }) => {
      return {
        mailId: input.mailId,
        analysis: { summary: '', category: 'unknown', priority: 'medium', sentiment: 'neutral', actionItems: [], entities: [], confidence: 0 },
      };
    }),

  archive: protectedProcedure
    .input(z.object({ mailId: z.string(), reason: z.string().optional() }))
    .mutation(async ({ input }) => {
      return { success: true, mailId: input.mailId };
    }),

  markAsRead: protectedProcedure
    .input(z.object({ mailId: z.string() }))
    .mutation(async ({ input }) => {
      return { success: true, mailId: input.mailId };
    }),

  stats: protectedProcedure.query(async () => {
    return { total: 0, unread: 0, analyzed: 0 };
  }),
});
