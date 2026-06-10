/**
 * Task Status Transition Policy
 * 작업 상태 전환 정책
 */

import type { CardStatus } from './board';

export interface StatusTransition {
  from: CardStatus;
  to: CardStatus;
  condition: string;
  action: string;
  autoTransition?: boolean;
}

export interface StatusTransitionPolicy {
  /**
   * 상태 전환 가능 여부 확인
   */
  canTransition(from: CardStatus, to: CardStatus): boolean;
  
  /**
   * 상태 전환 실행
   */
  transition(currentStatus: CardStatus, targetStatus: CardStatus): StatusTransitionResult;
  
  /**
   * 자동 전환 규칙 조회
   */
  getAutoTransitions(): StatusTransition[];
  
  /**
   * 차단 상태에서 Deferred로 전환
   */
  blockedToDeferred(blockedReason: string): StatusTransitionResult;
}

export interface StatusTransitionResult {
  success: boolean;
  from: CardStatus;
  to: CardStatus;
  message: string;
  timestamp: Date;
}

/**
 * 유효한 상태 전환 정의
 */
export const VALID_TRANSITIONS: StatusTransition[] = [
  // Backlog transitions
  { from: 'backlog', to: 'ready', condition: '작업 준비 완료', action: '준비 상태로 이동' },
  
  // Ready transitions
  { from: 'ready', to: 'in-progress', condition: '작업 시작', action: '진행 중으로 이동' },
  { from: 'ready', to: 'backlog', condition: '우선순위 변경', action: '백로그로 이동' },
  
  // In Progress transitions
  { from: 'in-progress', to: 'done', condition: '작업 완료', action: '완료로 이동' },
  { from: 'in-progress', to: 'blocked', condition: '문제 발생', action: '차단으로 이동' },
  { from: 'in-progress', to: 'deferred', condition: '외부 의존성', action: '연기로 이동' },
  { from: 'in-progress', to: 'ready', condition: '작업 중단', action: '준비로 이동' },
  
  // Done transitions
  { from: 'done', to: 'in-progress', condition: '재작업 필요', action: '진행 중으로 이동' },
  
  // Blocked transitions
  { from: 'blocked', to: 'in-progress', condition: '문제 해결', action: '진행 중으로 이동' },
  { from: 'blocked', to: 'deferred', condition: '외부 의존성 확인', action: '연기로 이동' },
  { from: 'blocked', to: 'ready', condition: '우회 전략 적용', action: '준비로 이동' },
  
  // Deferred transitions
  { from: 'deferred', to: 'in-progress', condition: '의존성 해결', action: '진행 중으로 이동' },
  { from: 'deferred', to: 'ready', condition: '조건 변경', action: '준비로 이동' }
];

/**
 * 자동 전환 규칙
 */
export const AUTO_TRANSITIONS: StatusTransition[] = [
  {
    from: 'blocked',
    to: 'deferred',
    condition: '외부 의존성으로 인한 차단',
    action: '자동으로 연기 상태로 전환',
    autoTransition: true
  }
];

export class TaskStatusTransitionPolicy implements StatusTransitionPolicy {
  private transitions: StatusTransition[] = VALID_TRANSITIONS;
  
  canTransition(from: CardStatus, to: CardStatus): boolean {
    return this.transitions.some(t => t.from === from && t.to === to);
  }
  
  transition(currentStatus: CardStatus, targetStatus: CardStatus): StatusTransitionResult {
    if (!this.canTransition(currentStatus, targetStatus)) {
      return {
        success: false,
        from: currentStatus,
        to: targetStatus,
        message: `Invalid transition from ${currentStatus} to ${targetStatus}`,
        timestamp: new Date()
      };
    }
    
    const transition = this.transitions.find(
      t => t.from === currentStatus && t.to === targetStatus
    );
    
    return {
      success: true,
      from: currentStatus,
      to: targetStatus,
      message: transition?.action || 'Status updated',
      timestamp: new Date()
    };
  }
  
  getAutoTransitions(): StatusTransition[] {
    return AUTO_TRANSITIONS;
  }
  
  blockedToDeferred(blockedReason: string): StatusTransitionResult {
    return {
      success: true,
      from: 'blocked',
      to: 'deferred',
      message: `차단 사유: ${blockedReason} → 연기 상태로 전환`,
      timestamp: new Date()
    };
  }
}
