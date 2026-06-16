/**
 * Mail Router — proxies to mail-intelligence analyze API.
 */

import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from './trpc';

const MAIL_INTELLIGENCE_URL = process.env.MAIL_INTELLIGENCE_URL || 'http://localhost:3010';
const MAIL_INTERNAL_API_KEY = process.env.MAIL_INTERNAL_API_KEY || '';

async function readJson(response: Response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

async function fetchAnalyze(query = 'top=50&sync=cache') {
  const response = await fetch(`${MAIL_INTELLIGENCE_URL}/api/outlook/analyze?${query}`, {
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    return { mails: [], total: 0, threadGroups: [], connected: false };
  }
  const data = (await response.json()) as {
    messages?: unknown[];
    sync?: { totalCached?: number };
    threadGroups?: unknown[];
    connected?: unknown;
    threadGrouping?: unknown;
  };
  return {
    mails: data.messages || [],
    total: data.sync?.totalCached ?? (data.messages?.length || 0),
    threadGroups: data.threadGroups || [],
    connected: Boolean(data.connected),
    threadGrouping: data.threadGrouping,
    sync: data.sync,
  };
}

async function postMailIntelligence(
  path: string,
  payload: Record<string, unknown>,
  approvalId: string
) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-AIOS-Approval-Id': approvalId,
  };
  if (MAIL_INTERNAL_API_KEY) headers['X-Mail-Internal-Key'] = MAIL_INTERNAL_API_KEY;

  const response = await fetch(`${MAIL_INTELLIGENCE_URL.replace(/\/$/, '')}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(30_000),
  });
  const data = await readJson(response);
  if (!response.ok) {
    throw new Error(`mail-intelligence mutation failed: ${response.status}`);
  }
  return data;
}

function requireApprovalId(approvalId?: string) {
  if (!approvalId) {
    throw new TRPCError({
      code: 'CONFLICT',
      message: 'Approval is required before mutating mail state',
    });
  }
  return approvalId;
}

export const mailRouter = router({
  list: protectedProcedure
    .input(z.object({ limit: z.number().optional().default(50), offset: z.number().optional().default(0) }).optional())
    .query(async ({ input }) => {
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;
      const data = await fetchAnalyze(`top=${offset + limit}&sync=cache`);
      const mails = (data.mails as unknown[]).slice(offset, offset + limit);
      return {
        mails,
        total: data.total,
        limit,
        offset,
        threadGroups: data.threadGroups,
      };
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
      const result = await postMailIntelligence(
        '/api/outlook/archive',
        { messageId: input.mailId, reason: input.reason },
        requireApprovalId(input.approvalId)
      );
      return {
        success: true,
        mailId: input.mailId,
        ...(typeof result === 'object' && result !== null ? result : { result }),
      };
    }),

  markAsRead: protectedProcedure
    .input(z.object({ mailId: z.string(), approvalId: z.string().optional() }))
    .mutation(async ({ input }) => {
      const result = await postMailIntelligence(
        '/api/outlook/read',
        { messageId: input.mailId, isRead: true },
        requireApprovalId(input.approvalId)
      );
      return {
        success: true,
        mailId: input.mailId,
        ...(typeof result === 'object' && result !== null ? result : { result }),
      };
    }),

  stats: protectedProcedure.query(async () => {
    const summary = await fetchAnalyze('top=1&sync=cache');
    const data =
      summary.total > (summary.mails as unknown[]).length
        ? await fetchAnalyze(`top=${summary.total}&sync=cache`)
        : summary;
    const mails = data.mails as Array<{ isRead?: boolean; aiAnalysis?: unknown }>;
    return {
      total: data.total,
      unread: mails.filter((m) => !m.isRead).length,
      analyzed: mails.filter((m) => m.aiAnalysis).length,
      connected: data.connected,
    };
  }),
});
