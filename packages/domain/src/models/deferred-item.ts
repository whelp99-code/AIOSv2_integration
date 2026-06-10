/**
 * Deferred Item Domain Model
 * 연기된 항목 관리를 위한 도메인 모델
 */

export interface DeferredItem {
  id: string;
  taskId: string;
  phase: string;
  reason: DeferredReason;
  description: string;
  requiredInfo: string[];
  createdAt: Date;
  resolvedAt?: Date;
  resolution?: string;
  metadata: Record<string, unknown>;
}

export type DeferredReason = 
  | 'external-dependency'
  | 'secret-required'
  | 'operational-access'
  | 'verification-needed'
  | 'billing-risk'
  | 'data-destruction-risk'
  | 'other';

export interface DeferredItemCreationRequest {
  taskId: string;
  phase: string;
  reason: DeferredReason;
  description: string;
  requiredInfo: string[];
}

export interface DeferredItemResolutionRequest {
  id: string;
  resolution: string;
  resolvedBy: string;
}

export interface DeferredItemFilter {
  phase?: string;
  reason?: DeferredReason;
  status?: 'pending' | 'resolved';
}

// Common deferred reasons with descriptions
export const DEFERRED_REASONS: Record<DeferredReason, string> = {
  'external-dependency': '외부 서비스 또는 라이브러리 의존성',
  'secret-required': '시크릿, 토큰, API 키 필요',
  'operational-access': '운영 환경 접근 필요',
  'verification-needed': '검증 필요',
  'billing-risk': '과금 위험',
  'data-destruction-risk': '데이터 파괴 위험',
  'other': '기타'
};
