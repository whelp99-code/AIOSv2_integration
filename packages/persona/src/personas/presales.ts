/**
 * PresalesPersona - 프리세일즈 페르소나
 * 
 * 기술 검토, 솔루션 설계, 기술 문의 답변 초안을 담당한다.
 */

import { type MailItem, type ClassificationResult } from '../mail/classifier';

// 기술 검토 결과
export interface TechReview {
  id: string;
  mailId: string;
  inquiryType: 'PRODUCT_SPEC' | 'COMPATIBILITY' | 'PERFORMANCE' | 'SECURITY' | 'GENERAL';
  complexity: 'LOW' | 'MEDIUM' | 'HIGH';
  estimatedEffort: string;
  findings: string[];
  createdAt: string;
}

// 솔루션 설계
export interface SolutionDesign {
  id: string;
  reviewId: string;
  title: string;
  overview: string;
  components: string[];
  estimatedCost: number;
  estimatedTimeline: string;
  createdAt: string;
}

// 기술 답변 초안
export interface TechResponse {
  id: string;
  mailId: string;
  subject: string;
  content: string;
  status: 'DRAFT' | 'REVIEWED' | 'SENT';
  createdAt: string;
}

// 프리세일즈 처리 결과
export interface PresalesResult {
  mailId: string;
  review: TechReview | null;
  design: SolutionDesign | null;
  response: TechResponse | null;
  action: 'TECH_REVIEWED' | 'SOLUTION_DESIGNED' | 'RESPONSE_DRAFTED' | 'NO_ACTION';
  timestamp: string;
}

/**
 * 프리세일즈 페르소나
 */
export class PresalesPersona {
  /**
   * 메일 처리
   */
  async processMail(mail: MailItem, classification: ClassificationResult): Promise<PresalesResult> {
    console.log(`[Presales] Processing mail: ${mail.id} - ${mail.subject}`);

    // 1. 기술 검토
    const review = this.performTechReview(mail);

    // 2. 솔루션 설계 (복잡도가 MEDIUM 이상인 경우)
    let design: SolutionDesign | null = null;
    if (review.complexity === 'MEDIUM' || review.complexity === 'HIGH') {
      design = this.designSolution(review, mail);
    }

    // 3. 기술 답변 초안 (솔루션 설계가 있는 경우에만)
    let response: TechResponse | null = null;
    if (design) {
      response = this.draftResponse(mail, review, design);
    }

    // 4. 액션 결정 — 파이프라인 단계별로 가장 높은 완료 단계 반영
    let action: PresalesResult['action'];
    if (response) {
      action = 'RESPONSE_DRAFTED';
    } else if (design) {
      action = 'SOLUTION_DESIGNED';
    } else {
      action = 'TECH_REVIEWED';
    }

    return {
      mailId: mail.id,
      review,
      design,
      response,
      action,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 기술 검토 수행
   */
  private performTechReview(mail: MailItem): TechReview {
    const inquiryType = this.classifyInquiry(mail);
    const complexity = this.assessComplexity(mail);
    const findings = this.analyzeRequirements(mail);

    return {
      id: `review-${Date.now()}`,
      mailId: mail.id,
      inquiryType,
      complexity,
      estimatedEffort: this.estimateEffort(complexity),
      findings,
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * 문의 유형 분류
   */
  private classifyInquiry(mail: MailItem): TechReview['inquiryType'] {
    const subject = mail.subject.toLowerCase();
    const body = mail.body.toLowerCase();
    const text = `${subject} ${body}`;

    if (text.includes('사양') || text.includes('spec')) return 'PRODUCT_SPEC';
    if (text.includes('호환') || text.includes('compatibility')) return 'COMPATIBILITY';
    if (text.includes('성능') || text.includes('performance')) return 'PERFORMANCE';
    if (text.includes('보안') || text.includes('security')) return 'SECURITY';
    return 'GENERAL';
  }

  /**
   * 복잡도 평가
   */
  private assessComplexity(mail: MailItem): TechReview['complexity'] {
    const highKeywords = ['integration', 'migration', 'custom', 'enterprise', '대규모'];
    const mediumKeywords = ['configuration', 'setup', '설정', '구성'];

    const text = `${mail.subject} ${mail.body}`.toLowerCase();

    if (highKeywords.some(kw => text.includes(kw))) return 'HIGH';
    if (mediumKeywords.some(kw => text.includes(kw))) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * 요구사항 분석
   */
  private analyzeRequirements(mail: MailItem): string[] {
    const findings: string[] = [];

    // 기술 키워드 기반 분석
    const techTerms = ['API', 'SDK', 'REST', 'GraphQL', 'database', 'DB', 'cache', 'Redis'];
    const text = `${mail.subject} ${mail.body}`;

    techTerms.forEach(term => {
      if (text.includes(term)) {
        findings.push(`${term} 관련 요구사항 확인됨`);
      }
    });

    if (findings.length === 0) {
      findings.push('구체적 기술 요구사항 없음');
    }

    return findings;
  }

  /**
   * 노력 추정
   */
  private estimateEffort(complexity: TechReview['complexity']): string {
    switch (complexity) {
      case 'LOW': return '1-2 시간';
      case 'MEDIUM': return '반나절';
      case 'HIGH': return '1-2 일';
    }
  }

  /**
   * 솔루션 설계
   */
  private designSolution(review: TechReview, mail: MailItem): SolutionDesign {
    const components = this.identifyComponents(review);
    const estimatedCost = this.estimateCost(review.complexity);

    return {
      id: `design-${Date.now()}`,
      reviewId: review.id,
      title: `솔루션 설계: ${mail.subject}`,
      overview: this.generateOverview(review, mail),
      components,
      estimatedCost,
      estimatedTimeline: this.estimateTimeline(review.complexity),
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * 구성 요소 식별
   */
  private identifyComponents(review: TechReview): string[] {
    const components: string[] = ['기본 시스템'];

    if (review.inquiryType === 'COMPATIBILITY') {
      components.push('호환성 레이어');
    }
    if (review.inquiryType === 'PERFORMANCE') {
      components.push('캐싱 레이어', '로드 밸런서');
    }
    if (review.complexity === 'HIGH') {
      components.push('모니터링 시스템', '장애 복구 모듈');
    }

    return components;
  }

  /**
   * 비용 추정
   */
  private estimateCost(complexity: TechReview['complexity']): number {
    switch (complexity) {
      case 'LOW': return 1000000;
      case 'MEDIUM': return 5000000;
      case 'HIGH': return 20000000;
    }
  }

  /**
   * 일정 추정
   */
  private estimateTimeline(complexity: TechReview['complexity']): string {
    switch (complexity) {
      case 'LOW': return '1주';
      case 'MEDIUM': return '2-3주';
      case 'HIGH': return '1-2개월';
    }
  }

  /**
   * 개요 생성
   */
  private generateOverview(review: TechReview, mail: MailItem): string {
    return `
## 기술 검토 개요
- 문의 유형: ${review.inquiryType}
- 복잡도: ${review.complexity}
- 예상 노력: ${review.estimatedEffort}

## 주요 발견사항
${review.findings.map(f => `- ${f}`).join('\n')}
    `.trim();
  }

  /**
   * 기술 답변 초안 작성
   */
  private draftResponse(mail: MailItem, review: TechReview, design: SolutionDesign | null): TechResponse {
    let content = `안녕하세요,\n\n`;
    content += `기술 문의에 대한 답변 드립니다.\n\n`;
    content += `## 검토 결과\n`;
    content += `- 문의 유형: ${review.inquiryType}\n`;
    content += `- 복잡도: ${review.complexity}\n\n`;

    if (design) {
      content += `## 제안 솔루션\n`;
      content += `- ${design.title}\n`;
      content += `- 예상 비용: ${design.estimatedCost.toLocaleString()}원\n`;
      content += `- 예상 일정: ${design.estimatedTimeline}\n\n`;
    }

    content += `추가 문의사항이 있으시면 연락 부탁드립니다.\n\n`;
    content += `감사합니다.`;

    return {
      id: `response-${Date.now()}`,
      mailId: mail.id,
      subject: `RE: ${mail.subject}`,
      content,
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
    };
  }
}
