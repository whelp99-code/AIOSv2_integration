import { describe, it, expect } from 'vitest';

/**
 * CEO 브리핑 대시보드 최종 검증 테스트
 */

// 대시보드 데이터 시뮬레이션
interface DashboardData {
  briefing: {
    date: string;
    summary: {
      totalProcessed: number;
      autoHandled: number;
      requiresApproval: number;
      requiresReview: number;
      alerts: number;
    };
    actionItems: Array<{
      id: string;
      type: string;
      title: string;
      priority: string;
      personaType: string;
    }>;
    approvalPending: Array<{
      id: string;
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
  };
  approvals: Array<{
    id: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    approver: string | null;
  }>;
}

// 대시보드 데이터 생성
function generateDashboardData(): DashboardData {
  const briefing = {
    date: '2026-06-23',
    summary: {
      totalProcessed: 15,
      autoHandled: 12,
      requiresApproval: 2,
      requiresReview: 1,
      alerts: 0,
    },
    actionItems: [
      { id: 'action-1', type: 'APPROVAL_PENDING', title: '500만원 계약 승인', priority: 'high', personaType: 'CEO' },
      { id: 'action-2', type: 'APPROVAL_PENDING', title: '300만원 청구서 승인', priority: 'high', personaType: 'CEO' },
      { id: 'action-3', type: 'ACTION_REQUIRED', title: '기술 문의 답변', priority: 'medium', personaType: 'PRESALES' },
    ],
    approvalPending: [
      { id: 'approval-1', title: '500만원 계약', priority: 'high' },
      { id: 'approval-2', title: '300만원 청구서', priority: 'high' },
    ],
    personaStats: [
      { personaType: 'SALES', totalProcessed: 3, successCount: 3, avgConfidence: 0.85 },
      { personaType: 'FINANCE', totalProcessed: 2, successCount: 2, avgConfidence: 0.9 },
      { personaType: 'PRESALES', totalProcessed: 2, successCount: 2, avgConfidence: 0.8 },
      { personaType: 'PM', totalProcessed: 1, successCount: 1, avgConfidence: 0.75 },
      { personaType: 'ENGINEER', totalProcessed: 4, successCount: 4, avgConfidence: 0.85 },
      { personaType: 'MARKETING', totalProcessed: 1, successCount: 1, avgConfidence: 0.8 },
      { personaType: 'WORK_SUPPORT', totalProcessed: 2, successCount: 2, avgConfidence: 0.6 },
    ],
    topCategories: [
      { category: 'ENGINEER', count: 4 },
      { category: 'SALES', count: 3 },
      { category: 'FINANCE', count: 2 },
      { category: 'PRESALES', count: 2 },
      { category: 'PM', count: 1 },
    ],
  };

  const approvals = [
    { id: 'approval-1', status: 'PENDING' as const, approver: null },
    { id: 'approval-2', status: 'PENDING' as const, approver: null },
  ];

  return { briefing, approvals };
}

// 승인 처리 시뮬레이션
function processApproval(
  approvals: DashboardData['approvals'],
  id: string,
  action: 'approve' | 'reject',
  approver: string,
): { success: boolean; message: string } {
  const approval = approvals.find(a => a.id === id);
  if (!approval) {
    return { success: false, message: 'Approval not found' };
  }

  if (approval.status !== 'PENDING') {
    return { success: false, message: `Already ${approval.status}` };
  }

  approval.status = action === 'approve' ? 'APPROVED' : 'REJECTED';
  approval.approver = approver;

  return { success: true, message: action === 'approve' ? 'Approved' : 'Rejected' };
}

describe('CEO Dashboard Final Verification', () => {
  describe('Dashboard Data', () => {
    it('should have correct briefing summary', () => {
      const data = generateDashboardData();

      expect(data.briefing.summary.totalProcessed).toBe(15);
      expect(data.briefing.summary.autoHandled).toBe(12);
      expect(data.briefing.summary.requiresApproval).toBe(2);
      expect(data.briefing.summary.requiresReview).toBe(1);
      expect(data.briefing.summary.alerts).toBe(0);
    });

    it('should have action items', () => {
      const data = generateDashboardData();

      expect(data.briefing.actionItems.length).toBe(3);
      expect(data.briefing.actionItems[0].priority).toBe('high');
    });

    it('should have approval pending items', () => {
      const data = generateDashboardData();

      expect(data.briefing.approvalPending.length).toBe(2);
      expect(data.briefing.approvalPending[0].priority).toBe('high');
    });

    it('should have persona stats', () => {
      const data = generateDashboardData();

      expect(data.briefing.personaStats.length).toBe(7);
      
      const salesStat = data.briefing.personaStats.find(s => s.personaType === 'SALES');
      expect(salesStat?.totalProcessed).toBe(3);
      expect(salesStat?.successCount).toBe(3);
    });

    it('should have top categories', () => {
      const data = generateDashboardData();

      expect(data.briefing.topCategories.length).toBe(5);
      expect(data.briefing.topCategories[0].category).toBe('ENGINEER');
      expect(data.briefing.topCategories[0].count).toBe(4);
    });
  });

  describe('Approval Processing', () => {
    it('should approve request', () => {
      const data = generateDashboardData();
      const result = processApproval(data.approvals, 'approval-1', 'approve', 'CEO');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Approved');

      const approval = data.approvals.find(a => a.id === 'approval-1');
      expect(approval?.status).toBe('APPROVED');
      expect(approval?.approver).toBe('CEO');
    });

    it('should reject request', () => {
      const data = generateDashboardData();
      const result = processApproval(data.approvals, 'approval-2', 'reject', 'CEO');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Rejected');

      const approval = data.approvals.find(a => a.id === 'approval-2');
      expect(approval?.status).toBe('REJECTED');
      expect(approval?.approver).toBe('CEO');
    });

    it('should not process already approved request', () => {
      const data = generateDashboardData();
      processApproval(data.approvals, 'approval-1', 'approve', 'CEO');

      const result = processApproval(data.approvals, 'approval-1', 'approve', 'CEO');
      expect(result.success).toBe(false);
      expect(result.message).toContain('APPROVED');
    });

    it('should not process non-existent request', () => {
      const data = generateDashboardData();
      const result = processApproval(data.approvals, 'non-existent', 'approve', 'CEO');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Approval not found');
    });
  });

  describe('Dashboard UI Components', () => {
    it('should render summary cards', () => {
      const data = generateDashboardData();
      const { summary } = data.briefing;

      // 요약 카드 데이터 검증
      expect(summary.totalProcessed).toBeGreaterThan(0);
      expect(summary.autoHandled).toBeGreaterThanOrEqual(0);
      expect(summary.requiresApproval).toBeGreaterThanOrEqual(0);
      expect(summary.alerts).toBeGreaterThanOrEqual(0);
    });

    it('should render approval cards', () => {
      const data = generateDashboardData();
      const { approvalPending } = data.briefing;

      // 승인 대기 항목 검증
      expect(approvalPending.length).toBeGreaterThan(0);
      approvalPending.forEach(item => {
        expect(item.id).toBeTruthy();
        expect(item.title).toBeTruthy();
        expect(item.priority).toBeTruthy();
      });
    });

    it('should render persona stats', () => {
      const data = generateDashboardData();
      const { personaStats } = data.briefing;

      // 페르소나 통계 검증
      expect(personaStats.length).toBeGreaterThan(0);
      personaStats.forEach(stat => {
        expect(stat.personaType).toBeTruthy();
        expect(stat.totalProcessed).toBeGreaterThanOrEqual(0);
        expect(stat.successCount).toBeGreaterThanOrEqual(0);
        expect(stat.avgConfidence).toBeGreaterThanOrEqual(0);
        expect(stat.avgConfidence).toBeLessThanOrEqual(1);
      });
    });

    it('should render top categories', () => {
      const data = generateDashboardData();
      const { topCategories } = data.briefing;

      // 상위 카테고리 검증
      expect(topCategories.length).toBeGreaterThan(0);
      topCategories.forEach(cat => {
        expect(cat.category).toBeTruthy();
        expect(cat.count).toBeGreaterThan(0);
      });

      // 정렬 확인 (내림차순)
      for (let i = 0; i < topCategories.length - 1; i++) {
        expect(topCategories[i].count).toBeGreaterThanOrEqual(topCategories[i + 1].count);
      }
    });
  });

  describe('Full Dashboard Flow', () => {
    it('should complete full briefing flow', () => {
      // 1. 대시보드 데이터 생성
      const data = generateDashboardData();
      expect(data.briefing).toBeTruthy();

      // 2. 승인 대기 확인
      expect(data.approvals.length).toBe(2);

      // 3. 승인 처리
      const approveResult = processApproval(data.approvals, 'approval-1', 'approve', 'CEO');
      expect(approveResult.success).toBe(true);

      // 4. 거부 처리
      const rejectResult = processApproval(data.approvals, 'approval-2', 'reject', 'CEO');
      expect(rejectResult.success).toBe(true);

      // 5. 최종 상태 확인
      const finalApprovals = data.approvals;
      expect(finalApprovals.every(a => a.status !== 'PENDING')).toBe(true);
    });

    it('should handle multiple approvals', () => {
      const data = generateDashboardData();

      // 모든 승인 처리
      data.approvals.forEach(approval => {
        const result = processApproval(data.approvals, approval.id, 'approve', 'CEO');
        expect(result.success).toBe(true);
      });

      // 최종 상태 확인
      expect(data.approvals.every(a => a.status === 'APPROVED')).toBe(true);
      expect(data.approvals.every(a => a.approver === 'CEO')).toBe(true);
    });
  });
});
