/**
 * Microsoft Graph mail adapter (HTTP facade to mail-intelligence standalone).
 */

const MAIL_INTELLIGENCE_URL = process.env.MAIL_INTELLIGENCE_URL || 'http://localhost:3010';

export interface GraphSyncResult {
  connected: boolean;
  messages: unknown[];
  sync?: {
    mode?: string;
    newCount?: number;
    totalCached?: number;
    lastSyncedAt?: string;
    deltaLink?: boolean;
  };
  threadGroups?: unknown[];
}

export class GraphMailAdapter {
  constructor(private baseUrl = MAIL_INTELLIGENCE_URL) {}

  private url(path: string) {
    return `${this.baseUrl.replace(/\/$/, '')}${path}`;
  }

  async syncInbox(options: { top?: number; sync?: 'cache' | 'auto' | 'initial' } = {}) {
    const top = options.top ?? 50;
    const sync = options.sync ?? 'auto';
    const response = await fetch(this.url(`/api/outlook/analyze?top=${top}&sync=${sync}`), {
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) {
      throw new Error(`syncInbox failed: ${response.status}`);
    }
    return (await response.json()) as GraphSyncResult;
  }

  async requestSendApproval(payload: Record<string, unknown>, approvalId?: string) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (approvalId) headers['X-AIOS-Approval-Id'] = approvalId;
  }

  async sendApprovedMail(payload: Record<string, unknown>, approvalId: string) {
    const response = await fetch(this.url('/api/outlook/send'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AIOS-Approval-Id': approvalId,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    });
    return response.json();
  }

  async markRead(messageId: string, approvalId: string, isRead = true) {
    const response = await fetch(this.url('/api/outlook/read'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AIOS-Approval-Id': approvalId,
      },
      body: JSON.stringify({ messageId, isRead }),
      signal: AbortSignal.timeout(15_000),
    });
    return response.json();
  }
}

export function createGraphMailAdapter(baseUrl?: string) {
  return new GraphMailAdapter(baseUrl);
}
