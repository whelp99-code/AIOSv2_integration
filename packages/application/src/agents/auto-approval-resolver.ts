/**
 * Auto Approval Policy Resolver
 * 자동 승인 정책 해석기
 */

import type { 
  ApprovalRequest, 
  ApprovalDecision,
  ApprovalPolicy,
  ApprovalRule
} from '@aios/domain';

export interface IAutoApprovalResolver {
  /**
   * 승인 요청 처리
   */
  resolveApproval(request: ApprovalRequest): Promise<ApprovalDecision>;
  
  /**
   * 자동 승인 가능 여부 확인
   */
  canAutoApprove(request: ApprovalRequest): Promise<boolean>;
  
  /**
   * 승인 정책 로드
   */
  loadPolicy(): Promise<ApprovalPolicy>;
  
  /**
   * 승인 규칙 평가
   */
  evaluateRules(request: ApprovalRequest, rules: ApprovalRule[]): Promise<boolean>;
}

export class AutoApprovalResolver implements IAutoApprovalResolver {
  private policy: ApprovalPolicy | null = null;
  
  async resolveApproval(request: ApprovalRequest): Promise<ApprovalDecision> {
    const canApprove = await this.canAutoApprove(request);
    
    if (canApprove) {
      return {
        requestId: request.id,
        decision: 'approved',
        reason: 'Auto-approved based on policy',
        decidedBy: 'system',
        decidedAt: new Date()
      };
    }
    
    return {
      requestId: request.id,
      decision: 'pending',
      reason: 'Requires manual approval',
      decidedBy: 'system',
      decidedAt: new Date()
    };
  }
  
  async canAutoApprove(request: ApprovalRequest): Promise<boolean> {
    const policy = await this.loadPolicy();
    
    // 제외 항목 확인
    if (this.isExcluded(request, policy.autoApproval.exclusions)) {
      return false;
    }
    
    // 자동 승인 조건 확인
    return this.evaluateRules(request, policy.rules);
  }
  
  async loadPolicy(): Promise<ApprovalPolicy> {
    if (!this.policy) {
      this.policy = {
        id: 'default-policy',
        name: 'Default Approval Policy',
        description: 'Default auto-approval policy for development',
        rules: [
          {
            id: 'file-creation',
            condition: 'type === "file-change" && action === "create"',
            action: 'auto-approve',
            priority: 1
          },
          {
            id: 'commit-creation',
            condition: 'type === "commit"',
            action: 'auto-approve',
            priority: 2
          },
          {
            id: 'pr-creation',
            condition: 'type === "pr-create"',
            action: 'auto-approve',
            priority: 3
          }
        ],
        autoApproval: {
          enabled: true,
          conditions: [
            {
              type: 'commit-message',
              pattern: '^(feat|fix|docs|chore|refactor)\\(phase\\d+\\):',
              description: 'Valid commit message format'
            }
          ],
          exclusions: [
            'operational-deployment',
            'database-migration',
            'data-deletion',
            'secret-exposure',
            'external-api-billing',
            'main-branch-push',
            'user-data-destruction'
          ]
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
    
    return this.policy;
  }
  
  async evaluateRules(request: ApprovalRequest, rules: ApprovalRule[]): Promise<boolean> {
    // 규칙 평가 로직 — 조건을 실제로 평가
    const env = process.env.NODE_ENV || 'development';
    const approvalGateEnabled = process.env.FEATURE_APPROVAL_GATE === '1' || env === 'production';

    // 프로덕션 또는 FEATURE_APPROVAL_GATE=1이면 자동 승인 안 함
    if (approvalGateEnabled) {
      return false;
    }

    // 개발 환경에서만 정책 기반 자동 승인
    for (const rule of rules) {
      if (rule.action === 'auto-approve' && this.matchCondition(request, rule.condition)) {
        return true;
      }
    }
    return false;
  }

  /** 조건 매칭 (간이 평가기) */
  private matchCondition(request: ApprovalRequest, condition: string): boolean {
    // type === "file-change" && action === "create" 같은 조건 파싱
    const typeMatch = condition.match(/type === "([^"]+)"/);
    const actionMatch = condition.match(/action === "([^"]+)"/);

    if (typeMatch && request.type !== typeMatch[1]) return false;
    if (actionMatch && request.context?.action !== actionMatch[1]) return false;

    return true;
  }
  
  private isExcluded(request: ApprovalRequest, exclusions: string[]): boolean {
    return exclusions.some(exclusion => 
      request.type.includes(exclusion) || 
      request.context.exclusion === exclusion
    );
  }
}
