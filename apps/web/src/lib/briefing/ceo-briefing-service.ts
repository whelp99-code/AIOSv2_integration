import {
  BriefingEngine,
  type BriefingEngineItem,
  type DailyBriefing,
} from '@aios/persona';

const DEMO_BRIEFING_ITEMS: BriefingEngineItem[] = [
  {
    mailId: 'mail-001',
    subject: '견적 요청 드립니다',
    category: 'SALES',
    confidence: 0.8,
    actionRequired: false,
    summary: '고객 견적 요청 — 영업팀 자동 처리',
  },
  {
    mailId: 'mail-002',
    subject: '청구서 발송 건',
    category: 'FINANCE',
    confidence: 0.85,
    actionRequired: false,
    summary: '재무팀 청구서 발송 알림',
  },
  {
    mailId: 'mail-003',
    subject: '기술 문의 드립니다',
    category: 'PRESALES',
    confidence: 0.75,
    actionRequired: false,
    summary: '프리세일즈 기술 문의',
  },
  {
    mailId: 'mail-004',
    subject: '긴급 승인 요청',
    category: 'CEO',
    confidence: 0.9,
    actionRequired: true,
    summary: '500만원 계약 승인 요청',
  },
];

class ApprovalStore {
  private approvals = new Map<
    string,
    {
      id: string;
      status: 'PENDING' | 'APPROVED' | 'REJECTED';
      approver: string | null;
      approvedAt: string | null;
      rejectionReason: string | null;
    }
  >();

  createApprovalRequest(id: string): void {
    if (this.approvals.has(id)) return;
    this.approvals.set(id, {
      id,
      status: 'PENDING',
      approver: null,
      approvedAt: null,
      rejectionReason: null,
    });
  }

  approve(id: string, approver: string): { success: boolean; message: string } {
    const approval = this.approvals.get(id);
    if (!approval) {
      return { success: false, message: 'Approval request not found' };
    }
    if (approval.status !== 'PENDING') {
      return { success: false, message: `Already ${approval.status}` };
    }
    approval.status = 'APPROVED';
    approval.approver = approver;
    approval.approvedAt = new Date().toISOString();
    return { success: true, message: 'Approved' };
  }

  reject(
    id: string,
    approver: string,
    reason: string,
  ): { success: boolean; message: string } {
    const approval = this.approvals.get(id);
    if (!approval) {
      return { success: false, message: 'Approval request not found' };
    }
    if (approval.status !== 'PENDING') {
      return { success: false, message: `Already ${approval.status}` };
    }
    approval.status = 'REJECTED';
    approval.approver = approver;
    approval.rejectionReason = reason;
    return { success: true, message: 'Rejected' };
  }
}

class CeoBriefingService {
  private engine = new BriefingEngine();
  private briefingHistory = new Map<string, DailyBriefing>();
  private approvalStore = new ApprovalStore();

  async getTodayBriefing(items: BriefingEngineItem[] = DEMO_BRIEFING_ITEMS): Promise<DailyBriefing> {
    const today = new Date().toISOString().split('T')[0];
    if (this.briefingHistory.has(today)) {
      return this.briefingHistory.get(today)!;
    }

    const briefing = this.engine.generateDailyBriefing(items);
    for (const item of briefing.approvalPending) {
      this.approvalStore.createApprovalRequest(item.id);
    }
    this.briefingHistory.set(today, briefing);
    return briefing;
  }

  approve(id: string, approver: string) {
    return this.approvalStore.approve(id, approver);
  }

  reject(id: string, approver: string, reason: string) {
    return this.approvalStore.reject(id, approver, reason);
  }
}

const globalForBriefing = globalThis as typeof globalThis & {
  __ceoBriefingService?: CeoBriefingService;
};

export function getCeoBriefingService(): CeoBriefingService {
  if (!globalForBriefing.__ceoBriefingService) {
    globalForBriefing.__ceoBriefingService = new CeoBriefingService();
  }
  return globalForBriefing.__ceoBriefingService;
}
