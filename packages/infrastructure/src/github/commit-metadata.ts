/**
 * Commit Metadata Model
 * 커밋 메타데이터 모델
 */

export interface CommitMetadata {
  /**
   * 커밋 해시
   */
  hash: string;
  
  /**
   * 커밋 메시지
   */
  message: string;
  
  /**
   * 작성자
   */
  author: CommitAuthor;
  
  /**
   * 커밋 일시
   */
  date: Date;
  
  /**
   * 변경된 파일 목록
   */
  files: string[];
  
  /**
   * 브랜치
   */
  branch: string;
  
  /**
   * 부모 커밋 해시
   */
  parentHashes: string[];
}

export interface CommitAuthor {
  name: string;
  email: string;
  date: Date;
}

export interface CommitMessageTemplate {
  /**
   * 타입
   */
  type: CommitType;
  
  /**
   * 스코프
   */
  scope?: string;
  
  /**
   * 설명
   */
  description: string;
  
  /**
   * 본문
   */
  body?: string;
  
  /**
   * 푸터
   */
  footer?: string;
}

export type CommitType = 
  | 'feat'
  | 'fix'
  | 'docs'
  | 'chore'
  | 'refactor'
  | 'test'
  | 'style'
  | 'ci'
  | 'perf'
  | 'build';

export interface CommitMessageGenerator {
  /**
   * 커밋 메시지 생성
   */
  generateMessage(template: CommitMessageTemplate): string;
  
  /**
   * 커밋 메시지 파싱
   */
  parseMessage(message: string): CommitMessageTemplate;
  
  /**
   * 커밋 메시지 유효성 검사
   */
  validateMessage(message: string): boolean;
}

/**
 * Phase 커밋 메시지 생성기
 */
export class PhaseCommitMessageGenerator implements CommitMessageGenerator {
  private readonly MESSAGE_PATTERN = /^(\w+)(?:\(([^)]+)\))?: (.+)$/;
  
  generateMessage(template: CommitMessageTemplate): string {
    let message = template.type;
    
    if (template.scope) {
      message += `(${template.scope})`;
    }
    
    message += `: ${template.description}`;
    
    if (template.body) {
      message += `\n\n${template.body}`;
    }
    
    if (template.footer) {
      message += `\n\n${template.footer}`;
    }
    
    return message;
  }
  
  parseMessage(message: string): CommitMessageTemplate {
    const match = message.match(this.MESSAGE_PATTERN);
    
    if (match) {
      return {
        type: match[1] as CommitType,
        scope: match[2] || undefined,
        description: match[3]
      };
    }
    
    return {
      type: 'chore',
      description: message
    };
  }
  
  validateMessage(message: string): boolean {
    return this.MESSAGE_PATTERN.test(message);
  }
}

/**
 * Phase 커밋 메시지 상수
 */
export const PHASE_COMMIT_MESSAGES = {
  PHASE_1: 'chore(phase1): add aios workspace tracking structure',
  PHASE_2: 'feat(phase2): implement core workflow domain and application layer',
  PHASE_3: 'feat(phase3): add hermes opencode runtime contract',
  PHASE_4: 'feat(phase4): add github pr automation adapter',
  PHASE_5: 'feat(phase5): implement kanban workflow state model',
  PHASE_6: 'docs(phase6): add final feature diff and gap analysis',
  PHASE_7: 'docs(phase7): add v2.0.1 enhancement roadmap'
} as const;
