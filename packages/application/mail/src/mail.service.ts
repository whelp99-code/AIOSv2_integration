/**
 * Mail Service
 * 메일 유스케이스 서비스 (AIOS v1 재활용 + mail-intelligence bridge)
 */

import type { AnalyzedMail, AIAnalysis, MailRepository } from '@aios/domain/mail';
import type { ClassificationFeedback, ThreadGroup } from '@aios/domain/mail';
import type { LLMClient, LLMMessage } from '@aios/infrastructure/llm';
import { createGraphMailAdapter, createJsonMailRepository } from '@aios/infrastructure/mail';

export class MailService {
  private graph = createGraphMailAdapter();
  private jsonRepo = process.env.MAIL_JSON_REPO_PATH
    ? createJsonMailRepository()
    : null;

  constructor(
    private mailRepo: MailRepository,
    private llm: LLMClient
  ) {}

  /** Optional JSON cache repository when MAIL_JSON_REPO_PATH is configured. */
  getJsonRepository() {
    return this.jsonRepo;
  }

  async syncInboxToJsonCache(options?: { top?: number; sync?: 'cache' | 'auto' | 'initial' }) {
    if (!this.jsonRepo) {
      throw new Error('MAIL_JSON_REPO_PATH is not configured');
    }
    const payload = await this.graph.syncInbox(options);
    const rawMessages = (payload as { messages?: Array<Record<string, unknown>> }).messages ?? [];
    const mails: AnalyzedMail[] = rawMessages
      .filter((message) => typeof message.id === 'string')
      .map((message) => ({
        id: String(message.id),
        subject: String(message.subject ?? '(제목 없음)'),
        from: {
          address: String((message.from as string | undefined) ?? 'unknown@local'),
          name: String(message.fromName ?? ''),
        },
        to: [],
        body: String(message.body ?? message.bodyPreview ?? ''),
        bodyPreview: String(message.bodyPreview ?? ''),
        receivedAt: String(message.receivedAt ?? new Date().toISOString()),
        isRead: Boolean(message.isRead),
        importance: 'normal',
        attachments: [],
        groupKey: typeof message.groupKey === 'string' ? message.groupKey : undefined,
        status: 'analyzed',
      }));
    await this.jsonRepo.replaceAll(mails);
    return { saved: mails.length, sync: payload.sync, connected: payload.connected };
  }

  async syncInbox(options?: { top?: number; sync?: 'cache' | 'auto' | 'initial' }) {
    return this.graph.syncInbox(options);
  }

  async analyzeInbox(options?: { top?: number }) {
    const payload = await this.graph.syncInbox({ top: options?.top ?? 50, sync: 'auto' });
    return {
      threadGroups: (payload.threadGroups || []) as ThreadGroup[],
      sync: payload.sync,
      connected: payload.connected,
    };
  }

  async saveClassificationFeedback(feedback: ClassificationFeedback) {
    const base = process.env.MAIL_INTELLIGENCE_URL || 'http://localhost:3010';
    const response = await fetch(`${base.replace(/\/$/, '')}/api/portal/feedback-sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messageId: feedback.messageId,
        userStatus: feedback.userStatus,
        reasonCode: feedback.reasonCode,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      throw new Error(`saveClassificationFeedback failed: ${response.status}`);
    }
    return response.json();
  }

  async requestSendApproval(_payload: Record<string, unknown>) {
    return {
      approvalStatus: 'pending' as const,
      note: 'Call apps/web /api/mail/send without approvalId to create pending approval',
    };
  }

  async sendApprovedMail(payload: Record<string, unknown>, approvalId: string) {
    return this.graph.sendApprovedMail(payload, approvalId);
  }

  async getMails(options?: { limit?: number; offset?: number }): Promise<AnalyzedMail[]> {
    return this.mailRepo.findAll(options);
  }

  async getMailById(id: string): Promise<AnalyzedMail | null> {
    return this.mailRepo.findById(id);
  }

  async getMailThread(groupKey: string): Promise<AnalyzedMail[]> {
    return this.mailRepo.findByGroupKey(groupKey);
  }

  async analyzeMail(mailId: string): Promise<AIAnalysis> {
    const mail = await this.mailRepo.findById(mailId);
    if (!mail) throw new Error(`Mail not found: ${mailId}`);

    const messages: LLMMessage[] = [
      {
        role: 'system',
        content: `You are an email analysis assistant. Analyze the email and provide:
- summary: brief summary
- category: classification (work, personal, marketing, notification, spam)
- priority: low/medium/high/urgent
- sentiment: positive/neutral/negative
- actionItems: list of action items
- entities: named entities (people, companies, dates, etc.)
- confidence: 0-1 confidence score
Respond in JSON format.`,
      },
      {
        role: 'user',
        content: `Subject: ${mail.subject}\nFrom: ${mail.from}\nBody: ${mail.body || mail.bodyPreview || ''}`,
      },
    ];

    const result = await this.llm.complete(messages);
    try {
      return JSON.parse(result.content) as AIAnalysis;
    } catch {
      return {
        summary: result.content,
        category: 'unknown',
        priority: 'medium',
        sentiment: 'neutral',
        actionItems: [],
        entities: [],
        confidence: 0.5,
      };
    }
  }

  async archiveMail(mailId: string, reason?: string): Promise<void> {
    await this.mailRepo.update(mailId, { status: 'archived' });
  }

  async markAsRead(mailId: string): Promise<void> {
    await this.mailRepo.update(mailId, { status: 'read' });
  }

  async getMailStats(): Promise<{ total: number; unread: number; analyzed: number }> {
    const all = await this.mailRepo.findAll();
    return {
      total: all.length,
      unread: all.filter((m) => m.status === 'unread').length,
      analyzed: all.filter((m) => m.aiAnalysis).length,
    };
  }
}
