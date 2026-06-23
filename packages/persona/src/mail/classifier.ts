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

    // CEO 관련 규칙 (승인 필요)
    this.addRule({
      name: 'ceo-approval',
      category: 'CEO',
      match: (mail) => {
        const ceoKeywords = ['승인', 'approval', '결제', 'payment', '긴급', 'urgent'];
        const subject = mail.subject.toLowerCase();
        return ceoKeywords.some(kw => subject.includes(kw));
      },
      confidence: 0.9,
    });

    // 업무지원 (기본값)
    this.addRule({
      name: 'work-support-default',
      category: 'WORK_SUPPORT',
      match: () => true, // 다른 규칙에 매칭되지 않으면 업무지원
      confidence: 0.5,
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
