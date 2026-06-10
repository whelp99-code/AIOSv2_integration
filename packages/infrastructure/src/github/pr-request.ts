/**
 * PR Creation Request Model
 * PR 생성 요청 모델
 */

export interface PRCreationRequest {
  /**
   * PR 제목
   */
  title: string;
  
  /**
   * PR 설명
   */
  body: string;
  
  /**
   * 소스 브랜치
   */
  head: string;
  
  /**
   * 대상 브랜치
   */
  base: string;
  
  /**
   * 드래프트 여부
   */
  draft?: boolean;
  
  /**
   * 리뷰어 목록
   */
  reviewers?: string[];
  
  /**
   * 레이블 목록
   */
  labels?: string[];
  
  /**
   * 마일스톤
   */
  milestone?: string;
  
  /**
   * 연결된 이슈
   */
  linkedIssues?: string[];
}

export interface PRUpdateRequest {
  /**
   * PR 제목
   */
  title?: string;
  
  /**
   * PR 설명
   */
  body?: string;
  
  /**
   * PR 상태
   */
  state?: 'open' | 'closed';
  
  /**
   * 리뷰어 목록
   */
  reviewers?: string[];
  
  /**
   * 레이블 목록
   */
  labels?: string[];
  
  /**
   * 마일스톤
   */
  milestone?: string;
}

export interface PRStatusTracking {
  /**
   * PR ID
   */
  id: number;
  
  /**
   * PR 번호
   */
  number: number;
  
  /**
   * PR 제목
   */
  title: string;
  
  /**
   * PR URL
   */
  url: string;
  
  /**
   * PR 상태
   */
  state: 'open' | 'closed' | 'merged';
  
  /**
   * 병합 가능 여부
   */
  mergeable: boolean;
  
  /**
   * 병합 상태
   */
  mergeState: 'clean' | 'dirty' | 'unstable' | 'blocked';
  
  /**
   * 리뷰 정보
   */
  reviews: PRReview[];
  
  /**
   * 체크 정보
   */
  checks: PRCheck[];
  
  /**
   * 생성 일시
   */
  createdAt: Date;
  
  /**
   * 업데이트 일시
   */
  updatedAt: Date;
  
  /**
   * 병합 일시
   */
  mergedAt?: Date;
}

export interface PRReview {
  id: number;
  state: 'approved' | 'changes_requested' | 'commented' | 'dismissed';
  reviewer: string;
  submittedAt: Date;
  body?: string;
}

export interface PRCheck {
  id: number;
  name: string;
  status: 'queued' | 'in_progress' | 'completed';
  conclusion: 'success' | 'failure' | 'neutral' | 'cancelled' | 'skipped';
  startedAt: Date;
  completedAt?: Date;
  detailsUrl?: string;
}

/**
 * PR 메타데이터 생성기
 */
export class PRMetadataGenerator {
  /**
   * Phase PR 제목 생성
   */
  generatePhasePRTitle(phase: number, description: string): string {
    return `feat(phase${phase}): ${description}`;
  }
  
  /**
   * PR 설명 생성
   */
  generatePRBody(phase: number, changes: string[]): string {
    const changesList = changes.map(change => `- ${change}`).join('\n');
    
    return `## Phase ${phase} Changes\n\n${changesList}\n\n## Checklist\n\n- [x] Code follows project structure\n- [x] No build/test/lint executed\n- [x] Documentation updated\n- [x] Ready for verification`;
  }
  
  /**
   * PR 레이블 생성
   */
  generateLabels(phase: number): string[] {
    return [`phase-${phase}`, 'development', 'auto-generated'];
  }
}
