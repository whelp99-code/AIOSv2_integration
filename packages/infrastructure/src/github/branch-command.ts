/**
 * Branch Creation Command Model
 * 브랜치 생성 명령 모델
 */

export interface BranchCreationCommand {
  /**
   * 브랜치 이름
   */
  branchName: string;
  
  /**
   * 기준 브랜치
   */
  baseBranch: string;
  
  /**
   * 브랜치 접두사
   */
  prefix?: BranchPrefix;
  
  /**
   * Phase 번호
   */
  phase?: number;
  
  /**
   * 작업 ID
   */
  taskId?: string;
  
  /**
   * 설명
   */
  description?: string;
}

export type BranchPrefix = 
  | 'feature'
  | 'fix'
  | 'chore'
  | 'docs'
  | 'refactor'
  | 'test'
  | 'phase';

export interface BranchNamingConvention {
  /**
   * 브랜치 이름 생성
   */
  generateBranchName(command: BranchCreationCommand): string;
  
  /**
   * 브랜치 이름 파싱
   */
  parseBranchName(branchName: string): ParsedBranchName;
  
  /**
   * 브랜치 이름 유효성 검사
   */
  validateBranchName(branchName: string): boolean;
}

export interface ParsedBranchName {
  prefix?: BranchPrefix;
  phase?: number;
  taskId?: string;
  description: string;
  isValid: boolean;
}

/**
 * Phase 브랜치 이름 생성기
 */
export class PhaseBranchNaming implements BranchNamingConvention {
  private readonly PHASE_PATTERN = /^phase\/(\d+)-(.+)$/;
  private readonly FEATURE_PATTERN = /^feature\/(.+)$/;
  
  generateBranchName(command: BranchCreationCommand): string {
    if (command.prefix === 'phase' && command.phase) {
      return `phase/${command.phase}-${command.description || command.taskId || 'update'}`;
    }
    
    if (command.prefix === 'feature') {
      return `feature/${command.description || command.taskId || 'update'}`;
    }
    
    return command.branchName;
  }
  
  parseBranchName(branchName: string): ParsedBranchName {
    const phaseMatch = branchName.match(this.PHASE_PATTERN);
    if (phaseMatch) {
      return {
        prefix: 'phase',
        phase: parseInt(phaseMatch[1]),
        description: phaseMatch[2],
        isValid: true
      };
    }
    
    const featureMatch = branchName.match(this.FEATURE_PATTERN);
    if (featureMatch) {
      return {
        prefix: 'feature',
        description: featureMatch[1],
        isValid: true
      };
    }
    
    return {
      description: branchName,
      isValid: false
    };
  }
  
  validateBranchName(branchName: string): boolean {
    return this.PHASE_PATTERN.test(branchName) || this.FEATURE_PATTERN.test(branchName);
  }
}

/**
 * Phase 브랜치 이름 상수
 */
export const PHASE_BRANCHES = {
  PHASE_1: 'phase/1-repo-baseline-and-workspace',
  PHASE_2: 'phase/2-core-workflow-domain-application',
  PHASE_3: 'phase/3-agent-runtime-hermes-opencode',
  PHASE_4: 'phase/4-github-pr-automation',
  PHASE_5: 'phase/5-kanban-integration',
  PHASE_6: 'phase/6-final-integration-and-gap-analysis',
  PHASE_7: 'phase/7-v201-roadmap'
} as const;
