/**
 * Mail Domain Entities
 * 메일 도메인 엔티티 (AIOS v1 재활용)
 */

import { z } from 'zod';

export const MailAddressSchema = z.object({
  address: z.string().email(),
  name: z.string().optional(),
});
export type MailAddress = z.infer<typeof MailAddressSchema>;

export const MailAttachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  contentType: z.string(),
  size: z.number(),
  contentId: z.string().optional(),
});
export type MailAttachment = z.infer<typeof MailAttachmentSchema>;

export const MailImportanceSchema = z.enum(['low', 'normal', 'high']);
export type MailImportance = z.infer<typeof MailImportanceSchema>;

export const MailMessageSchema = z.object({
  id: z.string(),
  subject: z.string(),
  from: MailAddressSchema,
  to: z.array(MailAddressSchema),
  cc: z.array(MailAddressSchema).optional(),
  body: z.string(),
  bodyPreview: z.string().optional(),
  receivedAt: z.string().datetime(),
  isRead: z.boolean().default(false),
  importance: MailImportanceSchema.default('normal'),
  attachments: z.array(MailAttachmentSchema).default([]),
  webLink: z.string().url().optional(),
  groupKey: z.string().optional(),
});
export type MailMessage = z.infer<typeof MailMessageSchema>;

export const AIAnalysisSchema = z.object({
  summary: z.string(),
  category: z.string(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  sentiment: z.enum(['positive', 'neutral', 'negative']),
  actionItems: z.array(z.string()),
  entities: z.array(z.object({
    type: z.string(),
    value: z.string(),
  })),
  confidence: z.number().min(0).max(1),
});
export type AIAnalysis = z.infer<typeof AIAnalysisSchema>;

export const AnalyzedMailSchema = MailMessageSchema.extend({
  aiAnalysis: AIAnalysisSchema.optional(),
  status: z.enum(['unread', 'read', 'analyzed', 'archived']).default('unread'),
});
export type AnalyzedMail = z.infer<typeof AnalyzedMailSchema>;
