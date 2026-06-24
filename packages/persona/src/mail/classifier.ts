/**
 * MailClassifier - 규칙 기반 이메일 분류기
 * 
 * 키워드/발신자 기반으로 메일을 분류하고 PersonaType 카테고리를 반환한다.
 */

import { z } from 'zod';

// PersonaType enum - 페르소나 라우팅용
export const PersonaTypeEnum = z.enum([
  'WORK_SUPPORT',    // 업무지원
  'SALES',           // 영업
  'PRESALES',        // 프리세일즈
  'ENGINEER',        // 엔지니어
  'PM',              // PM
  'FINANCE',         // 재무
  'MARKETING',       // 마케팅
  'CEO',             // CEO
]);

export type PersonaType = z.infer<typeof PersonaTypeEnum>;

// 분류 결과 스키마
export const ClassificationResultSchema = z.object({
  category: PersonaTypeEnum,
  confidence: z.number().min(0).max(1),
  matchedRules: z.array(z.string()),
  originalCategory: z.string().optional(),
});

export type ClassificationResult = z.infer<typeof ClassificationResultSchema>;

// 분류 규칙 인터페이스
interface ClassificationRule {
  name: string;
  category: PersonaType;
  match: (mail: MailItem) => boolean;
  confidence: number;
}

// 메일 아이템 인터페이스
export interface MailItem {
  id: string;
  subject: string;
  from: string;
  to: string[];
  body: string;
  receivedAt: string;
}

/**
 * 규칙 기반 메일 분류기
 */
export class MailClassifier {
  private rules: ClassificationRule[] = [];

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * 기본 분류 규칙 초기화
   */
  private initializeDefaultRules(): void {
    // 영업 관련 규칙 (강화)
    this.addRule({
      name: 'sales-opportunity',
      category: 'SALES',
      match: (mail) => {
        const opportunityKeywords = ['기회', 'opportunity', '리드', 'lead', '잠재고객', 'prospect'];
        const text = `${mail.subject} ${mail.body}`.toLowerCase();
        return opportunityKeywords.some(kw => text.includes(kw));
      },
      confidence: 0.85,
    });

    this.addRule({
      name: 'sales-deal',
      category: 'SALES',
      match: (mail) => {
        const dealKeywords = ['매출', '거래처', '영업실적', '매출목표', '수주', '거래', '구매의향', '발주', '주문', '납품'];
        const text = `${mail.subject} ${mail.body}`.toLowerCase();
        return dealKeywords.some(kw => text.includes(kw));
      },
      confidence: 0.85,
    });


    this.addRule({
      name: 'sales-negotiation',
      category: 'SALES',
      match: (mail) => {
        const negoKeywords = ['협상', 'negotiation', '계약', 'contract', '조건', 'terms'];
        const text = `${mail.subject} ${mail.body}`.toLowerCase();
        return negoKeywords.some(kw => text.includes(kw));
      },
      confidence: 0.9,
    });

    // 재무 관련 규칙 (강화)
    this.addRule({
      name: 'finance-expense',
      category: 'FINANCE',
      match: (mail) => {
        const expenseKeywords = ['비용', 'expense', '지출', 'expenditure', '영수증', 'receipt', '정산', 'settlement'];
        const text = `${mail.subject} ${mail.body}`.toLowerCase();
        return expenseKeywords.some(kw => text.includes(kw));
      },
      confidence: 0.8,
    });

    this.addRule({
      name: 'finance-budget',
      category: 'FINANCE',
      match: (mail) => {
        const budgetKeywords = ['예산', 'budget', '비용절감', 'cost saving', '투자', 'investment'];
        const text = `${mail.subject} ${mail.body}`.toLowerCase();
        return budgetKeywords.some(kw => text.includes(kw));
      },
      confidence: 0.75,
    });

    // 프리세일즈 관련 규칙 (강화)
    this.addRule({
      name: 'presales-demo',
      category: 'PRESALES',
      match: (mail) => {
        const demoKeywords = ['데모', 'demo', '시연', 'presentation', 'POC', 'pilot'];
        const text = `${mail.subject} ${mail.body}`.toLowerCase();
        return demoKeywords.some(kw => text.includes(kw));
      },
      confidence: 0.85,
    });

    this.addRule({
      name: 'presales-rfp',
      category: 'PRESALES',
      match: (mail) => {
        const rfpKeywords = ['RFP', 'RFI', '고객사', '고객', 'customer', '사전검증', '적합성', '평가', '비교표', 'comparison', 'matrix', '매핑'];
        const text = `${mail.subject} ${mail.body}`.toLowerCase();
        return rfpKeywords.some(kw => text.includes(kw));
      },
      confidence: 0.8,
    });

    this.addRule({
      name: 'presales-environment',
      category: 'PRESALES',
      match: (mail) => {
        const envKeywords = ['테스트환경', 'sandbox', '테스트 환경', '환경 설정', 'integration test', '검증환경'];
        const text = `${mail.subject} ${mail.body}`.toLowerCase();
        return envKeywords.some(kw => text.includes(kw));
      },
      confidence: 0.75,
    });


    this.addRule({
      name: 'presales-solution',
      category: 'PRESALES',
      match: (mail) => {
        const solutionKeywords = ['솔루션', 'solution', '아키텍처', 'architecture', '설계', 'design'];
        const text = `${mail.subject} ${mail.body}`.toLowerCase();
        return solutionKeywords.some(kw => text.includes(kw));
      },
      confidence: 0.8,
    });

    // PM 관련 규칙 (강화)
    this.addRule({
      name: 'pm-task',
      category: 'PM',
      match: (mail) => {
        const taskKeywords = ['작업', 'task', '할당', 'assign', '이슈', 'issue', '버그', 'bug'];
        const text = `${mail.subject} ${mail.body}`.toLowerCase();
        return taskKeywords.some(kw => text.includes(kw));
      },
      confidence: 0.75,
    });

    this.addRule({
      name: 'pm-milestone',
      category: 'PM',
      match: (mail) => {
        const milestoneKeywords = ['마일스톤', 'milestone', '단계', 'phase', '릴리스', 'release'];
        const text = `${mail.subject} ${mail.body}`.toLowerCase();
        return milestoneKeywords.some(kw => text.includes(kw));
      },
      confidence: 0.8,
    });

    this.addRule({
      name: 'pm-planning',
      category: 'PM',
      match: (mail) => {
        const pmPlanKeywords = ['스프린트', 'sprint', '스토리', 'story', '백로그', 'backlog', '우선순위', 'priority', '칸반', 'kanban', 'WBS', '산출물', 'deliverable', '요구사항', 'requirement'];
        const text = `${mail.subject} ${mail.body}`.toLowerCase();
        return pmPlanKeywords.some(kw => text.includes(kw));
      },
      confidence: 0.9,
    });

    this.addRule({
      name: 'pm-status',
      category: 'PM',
      match: (mail) => {
        const pmStatusKeywords = ['진행상황', '상태보고', '주간보고', '일일보고', 'standup', '회고', 'retrospective', '데모데이', 'planning poker'];
        const text = `${mail.subject} ${mail.body}`.toLowerCase();
        return pmStatusKeywords.some(kw => text.includes(kw));
      },
      confidence: 0.85,
    });

    // 엔지니어 관련 규칙
    this.addRule({
      name: 'engineer-code-review',
      category: 'ENGINEER',
      match: (mail) => {
        const codeKeywords = ['코드', 'code', '리뷰', 'review', 'PR', 'pull request', 'merge', 'commit'];
        const text = `${mail.subject} ${mail.body}`.toLowerCase();
        return codeKeywords.some(kw => text.includes(kw));
      },
      confidence: 0.8,
    });

    this.addRule({
      name: 'engineer-bug-fix',
      category: 'ENGINEER',
      match: (mail) => {
        const bugKeywords = ['버그', 'bug', '오류', 'error', '수정', 'fix', '패치', 'patch'];
        const text = `${mail.subject} ${mail.body}`.toLowerCase();
        return bugKeywords.some(kw => text.includes(kw));
      },
      confidence: 0.85,
    });

    this.addRule({
      name: 'engineer-build-deploy',
      category: 'ENGINEER',
      match: (mail) => {
        const buildKeywords = ['빌드', 'build', '배포', 'deploy', 'CI/CD', 'pipeline', '인프라', 'infra'];
        const text = `${mail.subject} ${mail.body}`.toLowerCase();
        return buildKeywords.some(kw => text.includes(kw));
      },
      confidence: 0.8,
    });

    this.addRule({
      name: 'engineer-infra',
      category: 'ENGINEER',
      match: (mail) => {
        const infraKeywords = ['컴파일', 'compile', '디버그', 'debug', '테스트케이스', 'testcase', 'API', 'DB', '서버', 'server', '클라이언트', 'client', '캐시', 'cache', '로드밸런서', 'loadbalancer', '쿠버네티스', 'kubernetes', '도커', 'docker'];
        const text = `${mail.subject} ${mail.body}`.toLowerCase();
        return infraKeywords.some(kw => text.includes(kw));
      },
      confidence: 0.9,
    });


    // 마케팅 관련 규칙 (강화)
    this.addRule({
      name: 'marketing-newsletter',
      category: 'MARKETING',
      match: (mail) => {
        const newsletterKeywords = ['뉴스레터', 'newsletter', '메일링', 'mailing', '구독', 'subscribe'];
        const text = `${mail.subject} ${mail.body}`.toLowerCase();
        return newsletterKeywords.some(kw => text.includes(kw));
      },
      confidence: 0.85,
    });

    this.addRule({
      name: 'marketing-brand',
      category: 'MARKETING',
      match: (mail) => {
        const brandKeywords = ['브랜드', 'brand', '로고', 'logo', '디자인', 'design', '가이드라인', 'guideline'];
        const text = `${mail.subject} ${mail.body}`.toLowerCase();
        return brandKeywords.some(kw => text.includes(kw));
      },
      confidence: 0.8,
    });


    // 영업 관련 규칙
    this.addRule({
      name: 'sales-keywords',
      category: 'SALES',
      match: (mail) => {
        const salesKeywords = ['견적', 'quote', '제안', 'proposal', '가격', 'price', '구매', 'purchase'];
        const subject = mail.subject.toLowerCase();
        const body = mail.body.toLowerCase();
        return salesKeywords.some(kw => subject.includes(kw) || body.includes(kw));
      },
      confidence: 0.8,
    });

    this.addRule({
      name: 'sales-customer-domain',
      category: 'SALES',
      match: (mail) => {
        // 고객 도메인 패턴 (예: @customer.com)
        const customerDomains = ['@customer.com', '@client.com', '@partner.co.kr'];
        return customerDomains.some(domain => mail.from.toLowerCase().includes(domain));
      },
      confidence: 0.7,
    });

    // 기술 문의 규칙
    this.addRule({
      name: 'presales-tech-inquiry',
      category: 'PRESALES',
      match: (mail) => {
        const techKeywords = ['기술', 'technical', '문의', 'inquiry', '사양', 'spec', '호환', 'compatibility'];
        const subject = mail.subject.toLowerCase();
        return techKeywords.some(kw => subject.includes(kw));
      },
      confidence: 0.75,
    });

    // 재무 관련 규칙
    this.addRule({
      name: 'finance-invoice',
      category: 'FINANCE',
      match: (mail) => {
        const financeKeywords = ['청구서', 'invoice', '송금', 'transfer', '결제', 'payment', '세금계산서', 'tax invoice'];
        const subject = mail.subject.toLowerCase();
        const body = mail.body.toLowerCase();
        return financeKeywords.some(kw => subject.includes(kw) || body.includes(kw));
      },
      confidence: 0.85,
    });

    // 프로젝트 관련 규칙
    this.addRule({
      name: 'pm-project',
      category: 'PM',
      match: (mail) => {
        const pmKeywords = ['프로젝트', 'project', '일정', 'schedule', '마감', 'deadline', '회의', 'meeting'];
        const subject = mail.subject.toLowerCase();
        return pmKeywords.some(kw => subject.includes(kw));
      },
      confidence: 0.7,
    });

    // 마케팅 관련 규칙
    this.addRule({
      name: 'marketing-content',
      category: 'MARKETING',
      match: (mail) => {
        const marketingKeywords = ['마케팅', 'marketing', '콘텐츠', 'content', '뉴스레터', 'newsletter', '브랜드', 'brand'];
        const subject = mail.subject.toLowerCase();
        return marketingKeywords.some(kw => subject.includes(kw));
      },
      confidence: 0.75,
    });

    this.addRule({
      name: 'marketing-campaign',
      category: 'MARKETING',
      match: (mail) => {
        const campaignKeywords = ['캠페인', 'campaign', 'SNS', '소셜', 'social', '광고', 'advertising', '프로모션', 'promotion', '타겟팅', 'targeting', '퍼널', 'funnel', '전환율', 'conversion'];
        const text = `${mail.subject} ${mail.body}`.toLowerCase();
        return campaignKeywords.some(kw => text.includes(kw));
      },
      confidence: 0.85,
    });


    // CEO 관련 규칙 (승인 필요)
    this.addRule({
      name: 'ceo-approval',
      category: 'CEO',
      match: (mail) => {
        const ceoKeywords = ['대표결제', '긴급지시', '긴급결제', '경영방침', '대표이사지시'];
        const subject = mail.subject.toLowerCase();
        return ceoKeywords.some(kw => subject.includes(kw));
      },
      confidence: 0.9,
    });

    this.addRule({
      name: 'ceo-directive',
      category: 'CEO',
      match: (mail) => {
        const ceoDirectiveKeywords = ['대표이사', 'CEO', '경영진', '경영', '전사적', '전사', '전략적', '전략', '긴급지시', '긴급결제', '이사회', 'board', '경영방침', '비전', 'vision'];
        const text = `${mail.subject} ${mail.body}`.toLowerCase();
        return ceoDirectiveKeywords.some(kw => text.includes(kw));
      },
      confidence: 0.95,
    });

    this.addRule({
      name: 'ceo-report',
      category: 'CEO',
      match: (mail) => {
        const ceoReportKeywords = ['대표님', '사장님', '임원', 'executive', '경영보고', '사업보고', '실적보고', '분기보고'];
        const text = `${mail.subject} ${mail.body}`.toLowerCase();
        return ceoReportKeywords.some(kw => text.includes(kw));
      },
      confidence: 0.9,
    });


    // WORK_SUPPORT 고유 규칙 (catch-all 대신 명시적 키워드 매칭)
    this.addRule({
      name: 'work-support-request',
      category: 'WORK_SUPPORT',
      match: (mail) => {
        const wsKeywords = ['지원', 'support', '요청', 'request', '확인부탁', '검토부탁', '문의드립니다', '업무지원', '도움', '안내', '공지', '전달드립니다'];
        const text = `${mail.subject} ${mail.body}`.toLowerCase();
        return wsKeywords.some(kw => text.includes(kw));
      },
      confidence: 0.8,
    });

    this.addRule({
      name: 'work-support-admin',
      category: 'WORK_SUPPORT',
      match: (mail) => {
        const adminKeywords = ['휴가', '연차', '출장', '근태', '복리후생', '사내', '사규', '규정', '교육', '연수'];
        const text = `${mail.subject} ${mail.body}`.toLowerCase();
        return adminKeywords.some(kw => text.includes(kw));
      },
      confidence: 0.85,
    });

    // 업무지원 (기본값 — 마지막 규칙, 낮은 신뢰도)
    this.addRule({
      name: 'work-support-default',
      category: 'WORK_SUPPORT',
      match: () => true,
      confidence: 0.3,
    });

  }

  /**
   * 분류 규칙 추가
   */
  addRule(rule: ClassificationRule): void {
    this.rules.push(rule);
  }

  /**
   * 메일 분류
   */
  classify(mail: MailItem): ClassificationResult {
    const matchedRules: string[] = [];
    let bestMatch: { category: PersonaType; confidence: number } | null = null;

    for (const rule of this.rules) {
      if (rule.match(mail)) {
        matchedRules.push(rule.name);
        
        if (!bestMatch || rule.confidence > bestMatch.confidence) {
          bestMatch = {
            category: rule.category,
            confidence: rule.confidence,
          };
        }
      }
    }

    if (!bestMatch) {
      // 기본값: 업무지원
      return {
        category: 'WORK_SUPPORT',
        confidence: 0.5,
        matchedRules: ['work-support-default'],
      };
    }

    return {
      category: bestMatch.category,
      confidence: bestMatch.confidence,
      matchedRules,
    };
  }

  /**
   * 기존 IngestionMailCategory와의 매핑
   */
  mapFromIngestionCategory(category: string): PersonaType {
    const mapping: Record<string, PersonaType> = {
      'TECH_QUESTION': 'PRESALES',
      'QUOTE_REQUEST': 'SALES',
      'FOLLOW_UP': 'WORK_SUPPORT',
      'MEETING_FOLLOW_UP': 'PM',
      'INTERNAL_NOTE': 'WORK_SUPPORT',
    };

    return mapping[category] || 'WORK_SUPPORT';
  }
}
