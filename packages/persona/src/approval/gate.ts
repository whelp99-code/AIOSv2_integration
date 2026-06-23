/**
 * ApprovalGate - 금액 기준 CEO 승인 게이트
 * 
 * 금액 임계값 기반 승인 필요 여부 판단, 승인/거부/수정 워크플로우, AuditLog 기록
 */

import { type PersonaType } from '../mail/classifier';

// 승인 상태
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED' | 'EXPIRED';

// 승인 요청
export interface ApprovalRequest {
  id: string;
  personaType: PersonaType;
  mailId: string;
  actionType: string;
  amount: number;
  currency: string;
  description: string;
  requester: string;
  status: ApprovalStatus;
  approver: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

// 감사 로그
export interface AuditLog {
  id: string;
  requestId: string;
  action: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED' | 'EXPIRED';
  actor: string;
  details: string;
  timestamp: string;
}

// 승인 정책
export interface ApprovalPolicy {
  id: string;
  name: string;
  minAmount: number;
  maxAmount: number | null;
  requiredApprovals: number;
  autoApproveBelow: number;
  createdAt: string;
}

// 승인 게이트 결과
export interface ApprovalGateResult {
  requiresApproval: boolean;
  request: ApprovalRequest | null;
  autoApproved: boolean;
  reason: string;
}

/**
 * ApprovalGate - CEO 승인 게이트
 */
export class ApprovalGate {
  private requests: Map<string, ApprovalRequest> = new Map();
  private auditLogs: AuditLog[] = [];
  private policies: ApprovalPolicy[] = [];

  constructor() {
    this.initializeDefaultPolicies();
  }

  /**
   * 기본 승인 정책 초기화
   */
  private initializeDefaultPolicies(): void {
    this.policies = [
      {
        id: 'policy-low',
        name: '소액 자동 승인',
        minAmount: 0,
        maxAmount: 100000,
        requiredApprovals: 0,
        autoApproveBelow: 100000,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'policy-medium',
        name: '중액 승인',
        minAmount: 100000,
        maxAmount: 1000000,
        requiredApprovals: 1,
        autoApproveBelow: 0,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'policy-high',
        name: '고액 CEO 승인',
        minAmount: 1000000,
        maxAmount: null,
        requiredApprovals: 1,
        autoApproveBelow: 0,
        createdAt: new Date().toISOString(),
      },
    ];
  }

  /**
   * 승인 필요 여부 판단
   */
  requiresApproval(personaType: PersonaType, amount: number): ApprovalGateResult {
    // CEO 관련은 항상 승인 필요
    if (personaType === 'CEO') {
      return {
        requiresApproval: true,
        request: null,
        autoApproved: false,
        reason: 'CEO 관련 액션은 항상 승인이 필요합니다.',
      };
    }

    // 정책에 따른 판단
    const policy = this.findPolicy(amount);

    if (!policy) {
      return {
        requiresApproval: false,
        request: null,
        autoApproved: false,
        reason: '적용 가능한 승인 정책이 없습니다.',
      };
    }

    // 자동 승인 임계값 미만
    if (amount < policy.autoApproveBelow) {
      return {
        requiresApproval: false,
        request: null,
        autoApproved: true,
        reason: `${policy.autoApproveBelow.toLocaleString()}원 미만 자동 승인.`,
      };
    }

    // 승인 필요
    return {
      requiresApproval: true,
      request: null,
      autoApproved: false,
      reason: `${policy.name}: ${amount.toLocaleString()}원은 승인이 필요합니다.`,
    };
  }

  /**
   * 승인 요청 생성
   */
  async submitApprovalRequest(
    personaType: PersonaType,
    mailId: string,
    actionType: string,
    amount: number,
    description: string,
    requester: string,
  ): Promise<ApprovalRequest> {
    const request: ApprovalRequest = {
      id: `approval-${Date.now()}`,
      personaType,
      mailId,
      actionType,
      amount,
      currency: 'KRW',
      description,
      requester,
      status: 'PENDING',
      approver: null,
      approvedAt: null,
      rejectionReason: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.requests.set(request.id, request);

    // 감사 로그 기록
    this.addAuditLog(request.id, 'SUBMITTED', requester, `승인 요청 제출: ${description}`);

    console.log(`[ApprovalGate] Approval request submitted: ${request.id} (${amount.toLocaleString()}원)`);
    return request;
  }

  /**
   * 승인 처리
   */
  async approve(requestId: string, approver: string): Promise<ApprovalRequest> {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`Approval request not found: ${requestId}`);
    }

    if (request.status !== 'PENDING') {
      throw new Error(`Request is not pending: ${request.status}`);
    }

    request.status = 'APPROVED';
    request.approver = approver;
    request.approvedAt = new Date().toISOString();
    request.updatedAt = new Date().toISOString();

    // 감사 로그 기록
    this.addAuditLog(requestId, 'APPROVED', approver, `승인 완료: ${request.description}`);

    console.log(`[ApprovalGate] Request approved: ${requestId} by ${approver}`);
    return request;
  }

  /**
   * 거부 처리
   */
  async reject(requestId: string, approver: string, reason: string): Promise<ApprovalRequest> {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`Approval request not found: ${requestId}`);
    }

    if (request.status !== 'PENDING') {
      throw new Error(`Request is not pending: ${request.status}`);
    }

    request.status = 'REJECTED';
    request.approver = approver;
    request.rejectionReason = reason;
    request.updatedAt = new Date().toISOString();

    // 감사 로그 기록
    this.addAuditLog(requestId, 'REJECTED', approver, `거부: ${reason}`);

    console.log(`[ApprovalGate] Request rejected: ${requestId} by ${approver}`);
    return request;
  }

  /**
   * 수정 요청 처리
   */
  async requestChanges(requestId: string, approver: string, feedback: string): Promise<ApprovalRequest> {
    const request = this.requests.get(requestId);
    if (!request) {
      throw new Error(`Approval request not found: ${requestId}`);
    }

    request.status = 'CHANGES_REQUESTED';
    request.approver = approver;
    request.rejectionReason = feedback;
    request.updatedAt = new Date().toISOString();

    // 감사 로그 기록
    this.addAuditLog(requestId, 'CHANGES_REQUESTED', approver, `수정 요청: ${feedback}`);

    console.log(`[ApprovalGate] Changes requested: ${requestId} by ${approver}`);
    return request;
  }

  /**
   * 정책 찾기
   */
  private findPolicy(amount: number): ApprovalPolicy | null {
    return this.policies.find(p => {
      if (p.maxAmount === null) {
        return amount >= p.minAmount;
      }
      return amount >= p.minAmount && amount < p.maxAmount;
    }) || null;
  }

  /**
   * 감사 로그 추가
   */
  private addAuditLog(requestId: string, action: AuditLog['action'], actor: string, details: string): void {
    const log: AuditLog = {
      id: `audit-${Date.now()}`,
      requestId,
      action,
      actor,
      details,
      timestamp: new Date().toISOString(),
    };

    this.auditLogs.push(log);
  }

  /**
   * 승인 요청 조회
   */
  getApprovalRequest(requestId: string): ApprovalRequest | null {
    return this.requests.get(requestId) || null;
  }

  /**
   * 대기 중인 승인 요청 목록 조회
   */
  getPendingRequests(): ApprovalRequest[] {
    return Array.from(this.requests.values()).filter(r => r.status === 'PENDING');
  }

  /**
   * 감사 로그 조회
   */
  getAuditLogs(requestId?: string): AuditLog[] {
    if (requestId) {
      return this.auditLogs.filter(log => log.requestId === requestId);
    }
    return [...this.auditLogs];
  }

  /**
   * 승인 정책 조회
   */
  getPolicies(): ApprovalPolicy[] {
    return [...this.policies];
  }
}
