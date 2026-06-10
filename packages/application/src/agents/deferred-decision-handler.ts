/**
 * Deferred Decision Handler
 * 연기 결정 처리기
 */

import type { 
  DeferredItem, 
  DeferredItemCreationRequest,
  DeferredItemResolutionRequest,
  DeferredReason,
  Task
} from '@aios/domain';

export interface IDeferredDecisionHandler {
  /**
   * 연기 결정 처리
   */
  handleDeferredDecision(task: Task, reason: DeferredReason): Promise<DeferredItem>;
  
  /**
   * 연기 항목 생성
   */
  createDeferredItem(request: DeferredItemCreationRequest): Promise<DeferredItem>;
  
  /**
   * 연기 항목 해결
   */
  resolveDeferredItem(request: DeferredItemResolutionRequest): Promise<DeferredItem>;
  
  /**
   * 연기 가능 여부 확인
   */
  canDefer(task: Task): Promise<boolean>;
  
  /**
   * 연기 사유 결정
   */
  determineDeferredReason(task: Task): DeferredReason;
  
  /**
   * 우회 개발안 선택
   */
  selectBypassStrategy(task: Task): Promise<BypassStrategy | null>;
}

export interface BypassStrategy {
  id: string;
  description: string;
  alternativeTask: Task;
  estimatedEffort: string;
}

export class DeferredDecisionHandler implements IDeferredDecisionHandler {
  async handleDeferredDecision(task: Task, reason: DeferredReason): Promise<DeferredItem> {
    const request: DeferredItemCreationRequest = {
      taskId: task.id,
      phase: task.metadata.phase as string || 'unknown',
      reason,
      description: `Deferred: ${task.title}`,
      requiredInfo: this.getRequiredInfo(reason)
    };
    
    return this.createDeferredItem(request);
  }
  
  async createDeferredItem(request: DeferredItemCreationRequest): Promise<DeferredItem> {
    return {
      id: `deferred-${Date.now()}`,
      taskId: request.taskId,
      phase: request.phase,
      reason: request.reason,
      description: request.description,
      requiredInfo: request.requiredInfo,
      createdAt: new Date(),
      metadata: {}
    };
  }
  
  async resolveDeferredItem(request: DeferredItemResolutionRequest): Promise<DeferredItem> {
    // 실제 구현에서는 DB에서 조회 후 업데이트
    return {
      id: request.id,
      taskId: '',
      phase: '',
      reason: 'other',
      description: '',
      requiredInfo: [],
      createdAt: new Date(),
      resolvedAt: new Date(),
      resolution: request.resolution,
      metadata: { resolvedBy: request.resolvedBy }
    };
  }
  
  async canDefer(task: Task): Promise<boolean> {
    // 연기 가능 여부 확인 로직
    return true;
  }
  
  determineDeferredReason(task: Task): DeferredReason {
    // 작업 특성에 따른 연기 사유 결정
    if (task.metadata.requiresSecret) {
      return 'secret-required';
    }
    if (task.metadata.requiresOperationalAccess) {
      return 'operational-access';
    }
    if (task.metadata.hasExternalDependency) {
      return 'external-dependency';
    }
    return 'other';
  }
  
  async selectBypassStrategy(task: Task): Promise<BypassStrategy | null> {
    // 우회 전략 선택 로직
    return null;
  }
  
  private getRequiredInfo(reason: DeferredReason): string[] {
    const reasonInfoMap: Record<DeferredReason, string[]> = {
      'external-dependency': ['외부 서비스 문서', 'API 명세'],
      'secret-required': ['API 키', '토큰', '인증 정보'],
      'operational-access': ['운영 환경 접근 권한', 'VPN 설정'],
      'verification-needed': ['테스트 결과', '검증 보고서'],
      'billing-risk': ['비용 견적', '승인 요청'],
      'data-destruction-risk': ['백업 확인', '복구 계획'],
      'other': ['상세 설명']
    };
    
    return reasonInfoMap[reason] || [];
  }
}
