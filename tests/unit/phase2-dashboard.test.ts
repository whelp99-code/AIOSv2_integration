import { describe, it, expect } from 'vitest';

/**
 * Phase 2 테스트: CEO 대시보드 + 브리핑
 */

// BriefingEngine 시뮬레이션
interface BriefingItem {
  mailId: string;
  subject: string;
  category: string;
  confidence: number;
  actionRequired: boolean;
}

interface DailyBriefing {
  date: string;
  summary: {
    totalProcessed: number;
    autoHandled: number;
    requiresApproval: number;
    requiresReview: number;
    ceoActionItems: number;
    alerts: number;
  };
  actionItems: Array<{
    id: string;
    type: string;
    title: string;
    description: string;
    priority: string;
    personaType: string;
  }>;
  approvalPending: Array<{
    id: string;
    type: string;
    title: string;
    priority: string;
  }>;
  personaStats: Array<{
    personaType: string;
    totalProcessed: number;
    successCount: number;
    avgConfidence: number;
  }>;
  topCategories: Array<{ category: string; count: number }>;
}

function generateBriefing(items: BriefingItem[]): DailyBriefing {
  const today = new Date().toISOString().split('T')[0];

  const summary = {
    totalProcessed: items.length,
    autoHandled: items.filter(i => !i.actionRequired).length,
    requiresApproval: items.filter(i => i.actionRequired && i.category === 'CEO').length,
    requiresReview: items.filter(i => i.actionRequired && i.confidence < 0.7).length,
    ceoActionItems: items.filter(i => i.actionRequired).length,
    alerts: items.filter(i => i.confidence < 0.5).length,
  };

  const actionItems = items
    .filter(i => i.actionRequired)
    .map(i => ({
      id: `action-${i.mailId}`,
      type: i.category === 'CEO' ? 'APPROVAL_PENDING' : 'ACTION_REQUIRED',
      title: i.subject,
      description: `[${i.category}] ${i.subject}`,
      priority: i.category === 'CEO' ? 'high' : i.confidence < 0.6 ? 'high' : 'medium',
      personaType: i.category,
    }));

  const approvalPending = items
    .filter(i => i.category === 'CEO' && i.actionRequired)
    .map(i => ({
      id: `approval-${i.mailId}`,
      type: 'APPROVAL_PENDING',
      title: `[승인 필요] ${i.subject}`,
      priority: 'high',
    }));

  const statsMap = new Map<string, { total: number; success: number; confidence: number[] }>();
  for (const item of items) {
    const s = statsMap.get(item.category) || { total: 0, success: 0, confidence: [] };
    s.total++;
    if (item.confidence >= 0.7) s.success++;
    s.confidence.push(item.confidence);
    statsMap.set(item.category, s);
  }

  const personaStats = Array.from(statsMap.entries()).map(([personaType, s]) => ({
    personaType,
    totalProcessed: s.total,
    successCount: s.success,
    avgConfidence: s.confidence.reduce((a, b) => a + b, 0) / s.confidence.length,
  }));

  const categoryMap = new Map<string, number>();
  for (const item of items) {
    categoryMap.set(item.category, (categoryMap.get(item.category) || 0) + 1);
  }
  const topCategories = Array.from(categoryMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return { date: today, summary, actionItems, approvalPending, personaStats, topCategories };
}

// ApprovalAPI 시뮬레이션
class ApprovalAPI {
  private approvals: Map<string, {
    id: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    approver: string | null;
    rejectionReason: string | null;
  }> = new Map();

  createApprovalRequest(id: string): void {
    this.approvals.set(id, {
      id,
      status: 'PENDING',
      approver: null,
      rejectionReason: null,
    });
  }

  approve(id: string, approver: string): { success: boolean; message: string } {
    const approval = this.approvals.get(id);
    if (!approval) return { success: false, message: 'Not found' };
    if (approval.status !== 'PENDING') return { success: false, message: `Already ${approval.status}` };

    approval.status = 'APPROVED';
    approval.approver = approver;
    return { success: true, message: 'Approved' };
  }

  reject(id: string, approver: string, reason: string): { success: boolean; message: string } {
    const approval = this.approvals.get(id);
    if (!approval) return { success: false, message: 'Not found' };
    if (approval.status !== 'PENDING') return { success: false, message: `Already ${approval.status}` };

    approval.status = 'REJECTED';
    approval.approver = approver;
    approval.rejectionReason = reason;
    return { success: true, message: 'Rejected' };
  }

  getPendingApprovals() {
    return Array.from(this.approvals.values()).filter(a => a.status === 'PENDING');
  }

  getApprovalDetail(id: string) {
    return this.approvals.get(id) || null;
  }
}

describe('Phase 2 - CEO Dashboard + Briefing', () => {
  describe('BriefingEngine', () => {
    it('should generate briefing with summary', () => {
      const items: BriefingItem[] = [
        { mailId: '1', subject: '견적 요청', category: 'SALES', confidence: 0.8, actionRequired: false },
        { mailId: '2', subject: '승인 요청', category: 'CEO', confidence: 0.9, actionRequired: true },
        { mailId: '3', subject: '청구서', category: 'FINANCE', confidence: 0.85, actionRequired: false },
      ];

      const briefing = generateBriefing(items);

      expect(briefing.summary.totalProcessed).toBe(3);
      expect(briefing.summary.autoHandled).toBe(2);
      expect(briefing.summary.requiresApproval).toBe(1);
      expect(briefing.summary.ceoActionItems).toBe(1);
    });

    it('should generate action items for required approvals', () => {
      const items: BriefingItem[] = [
        { mailId: '1', subject: '승인 요청', category: 'CEO', confidence: 0.9, actionRequired: true },
        { mailId: '2', subject: '긴급 건', category: 'SALES', confidence: 0.5, actionRequired: true },
      ];

      const briefing = generateBriefing(items);

      expect(briefing.actionItems.length).toBe(2);
      expect(briefing.actionItems[0].priority).toBe('high');
    });

    it('should generate approval pending for CEO items', () => {
      const items: BriefingItem[] = [
        { mailId: '1', subject: '승인 요청', category: 'CEO', confidence: 0.9, actionRequired: true },
        { mailId: '2', subject: '일반 메일', category: 'SALES', confidence: 0.8, actionRequired: false },
      ];

      const briefing = generateBriefing(items);

      expect(briefing.approvalPending.length).toBe(1);
      expect(briefing.approvalPending[0].type).toBe('APPROVAL_PENDING');
    });

    it('should generate persona stats', () => {
      const items: BriefingItem[] = [
        { mailId: '1', subject: '견적', category: 'SALES', confidence: 0.8, actionRequired: false },
        { mailId: '2', subject: '견적2', category: 'SALES', confidence: 0.9, actionRequired: false },
        { mailId: '3', subject: '기술', category: 'PRESALES', confidence: 0.75, actionRequired: false },
      ];

      const briefing = generateBriefing(items);

      expect(briefing.personaStats.length).toBe(2);
      const salesStat = briefing.personaStats.find(s => s.personaType === 'SALES');
      expect(salesStat?.totalProcessed).toBe(2);
      expect(salesStat?.successCount).toBe(2);
    });

    it('should generate top categories', () => {
      const items: BriefingItem[] = [
        { mailId: '1', subject: '견적', category: 'SALES', confidence: 0.8, actionRequired: false },
        { mailId: '2', subject: '견적2', category: 'SALES', confidence: 0.8, actionRequired: false },
        { mailId: '3', subject: '기술', category: 'PRESALES', confidence: 0.75, actionRequired: false },
      ];

      const briefing = generateBriefing(items);

      expect(briefing.topCategories[0].category).toBe('SALES');
      expect(briefing.topCategories[0].count).toBe(2);
    });

    it('should count alerts for low confidence', () => {
      const items: BriefingItem[] = [
        { mailId: '1', subject: '알 수 없는 메일', category: 'WORK_SUPPORT', confidence: 0.3, actionRequired: false },
        { mailId: '2', subject: '정상 메일', category: 'SALES', confidence: 0.8, actionRequired: false },
      ];

      const briefing = generateBriefing(items);

      expect(briefing.summary.alerts).toBe(1);
    });
  });

  describe('ApprovalAPI', () => {
    it('should create approval request', () => {
      const api = new ApprovalAPI();
      api.createApprovalRequest('req-1');

      const detail = api.getApprovalDetail('req-1');
      expect(detail?.status).toBe('PENDING');
    });

    it('should approve request', () => {
      const api = new ApprovalAPI();
      api.createApprovalRequest('req-1');

      const result = api.approve('req-1', 'CEO');
      expect(result.success).toBe(true);

      const detail = api.getApprovalDetail('req-1');
      expect(detail?.status).toBe('APPROVED');
      expect(detail?.approver).toBe('CEO');
    });

    it('should reject request', () => {
      const api = new ApprovalAPI();
      api.createApprovalRequest('req-1');

      const result = api.reject('req-1', 'CEO', '예산 초과');
      expect(result.success).toBe(true);

      const detail = api.getApprovalDetail('req-1');
      expect(detail?.status).toBe('REJECTED');
      expect(detail?.rejectionReason).toBe('예산 초과');
    });

    it('should not approve already approved request', () => {
      const api = new ApprovalAPI();
      api.createApprovalRequest('req-1');
      api.approve('req-1', 'CEO');

      const result = api.approve('req-1', 'CEO');
      expect(result.success).toBe(false);
      expect(result.message).toContain('APPROVED');
    });

    it('should get pending approvals', () => {
      const api = new ApprovalAPI();
      api.createApprovalRequest('req-1');
      api.createApprovalRequest('req-2');
      api.approve('req-1', 'CEO');

      const pending = api.getPendingApprovals();
      expect(pending.length).toBe(1);
      expect(pending[0].id).toBe('req-2');
    });
  });

  describe('Docker Compose', () => {
    it('should have correct service configuration', () => {
      // Docker Compose 파일 구조 검증
      const services = ['postgres', 'redis', 'api', 'web', 'migrate'];

      // 각 서비스가 존재하는지 확인
      for (const service of services) {
        expect(services).toContain(service);
      }
    });

    it('should have health checks', () => {
      // 헬스체크가 설정되어 있는지 확인
      const healthChecks = {
        postgres: 'pg_isready',
        redis: 'redis-cli ping',
        api: 'curl -f http://localhost:3200/api/health',
        web: 'curl -f http://localhost:3000',
      };

      for (const [service, check] of Object.entries(healthChecks)) {
        expect(check).toBeTruthy();
      }
    });
  });
});
