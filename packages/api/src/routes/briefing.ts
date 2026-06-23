/**
 * CEO 브리핑 API
 * 
 * 일일 브리핑 조회, 승인/거부 처리
 */

import { BriefingEngine, type BriefingItem, type DailyBriefing } from '@aios/persona';

// 브리핑 API 핸들러
export class BriefingAPI {
  private engine: BriefingEngine;
  private briefingHistory: Map<string, DailyBriefing> = new Map();

  constructor() {
    this.engine = new BriefingEngine();
  }

  /**
   * 오늘의 브리핑 조회
   */
  async getTodayBriefing(items: BriefingItem[]): Promise<DailyBriefing> {
    const today = new Date().toISOString().split('T')[0];

    // 오늘 브리핑이 이미 생성되었으면 캐시에서 반환
    if (this.briefingHistory.has(today)) {
      return this.briefingHistory.get(today)!;
    }

    // 새 브리핑 생성
    const briefing = this.engine.generateDailyBriefing(items);
    this.briefingHistory.set(today, briefing);

    return briefing;
  }

  /**
   * 브리핑 상세 조회
   */
  getBriefingDetail(date: string): DailyBriefing | null {
    return this.briefingHistory.get(date) || null;
  }

  /**
   * 브리핑 이력 조회
   */
  getBriefingHistory(): DailyBriefing[] {
    return Array.from(this.briefingHistory.values());
  }

  /**
   * 브리핑을 JSON으로 포맷
   */
  formatAsJson(briefing: DailyBriefing): string {
    return this.engine.formatAsJson(briefing);
  }

  /**
   * 브리핑을 마크다운으로 포맷
   */
  formatAsMarkdown(briefing: DailyBriefing): string {
    return this.engine.formatAsMarkdown(briefing);
  }
}

// 승인/거부 API
export class ApprovalAPI {
  private approvals: Map<string, {
    id: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    approver: string | null;
    approvedAt: string | null;
    rejectionReason: string | null;
  }> = new Map();

  /**
   * 승인 요청 생성
   */
  createApprovalRequest(id: string): void {
    this.approvals.set(id, {
      id,
      status: 'PENDING',
      approver: null,
      approvedAt: null,
      rejectionReason: null,
    });
  }

  /**
   * 승인 처리
   */
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

  /**
   * 거부 처리
   */
  reject(id: string, approver: string, reason: string): { success: boolean; message: string } {
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

  /**
   * 대기 중인 승인 목록 조회
   */
  getPendingApprovals(): Array<{ id: string; status: string }> {
    return Array.from(this.approvals.values())
      .filter(a => a.status === 'PENDING')
      .map(a => ({ id: a.id, status: a.status }));
  }

  /**
   * 승인 상세 조회
   */
  getApprovalDetail(id: string) {
    return this.approvals.get(id) || null;
  }
}

// API 라우트 생성
export function createBriefingRoutes(briefingAPI: BriefingAPI, approvalAPI: ApprovalAPI) {
  return {
    /**
     * GET /api/briefing/today - 오늘의 브리핑
     */
    getTodayBriefing: async (items: BriefingItem[]) => {
      const briefing = await briefingAPI.getTodayBriefing(items);
      return {
        status: 200,
        body: briefing,
      };
    },

    /**
     * GET /api/briefing/:date - 특정 날짜 브리핑
     */
    getBriefingByDate: (date: string) => {
      const briefing = briefingAPI.getBriefingDetail(date);
      if (!briefing) {
        return { status: 404, body: { error: 'Briefing not found' } };
      }
      return { status: 200, body: briefing };
    },

    /**
     * POST /api/approval/:id/approve - 승인
     */
    approve: (id: string, approver: string) => {
      const result = approvalAPI.approve(id, approver);
      return {
        status: result.success ? 200 : 400,
        body: result,
      };
    },

    /**
     * POST /api/approval/:id/reject - 거부
     */
    reject: (id: string, approver: string, reason: string) => {
      const result = approvalAPI.reject(id, approver, reason);
      return {
        status: result.success ? 200 : 400,
        body: result,
      };
    },

    /**
     * GET /api/approval/pending - 대기 목록
     */
    getPendingApprovals: () => {
      return {
        status: 200,
        body: approvalAPI.getPendingApprovals(),
      };
    },
  };
}
