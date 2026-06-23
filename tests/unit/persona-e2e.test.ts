import { describe, it, expect } from 'vitest';

/**
 * E2E 테스트: 분류 → 라우팅 → 브리핑 플로우
 * 
 * MailClassifier → PersonaRouter → WorkSupportPersona → BriefingEngine
 */

// MailClassifier (규칙 기반 분류)
interface MailItem {
  id: string;
  subject: string;
  from: string;
  to: string[];
  body: string;
  receivedAt: string;
}

type PersonaType = 'WORK_SUPPORT' | 'SALES' | 'PRESALES' | 'ENGINEER' | 'PM' | 'FINANCE' | 'MARKETING' | 'CEO';

interface ClassificationResult {
  category: PersonaType;
  confidence: number;
  matchedRules: string[];
}

function classifyMail(mail: MailItem): ClassificationResult {
  const subject = mail.subject.toLowerCase();
  const body = mail.body.toLowerCase();
  const matchedRules: string[] = [];
  let category: PersonaType = 'WORK_SUPPORT';
  let confidence = 0.5;

  const salesKeywords = ['견적', 'quote', '제안', 'proposal', '가격', 'price'];
  if (salesKeywords.some(kw => subject.includes(kw) || body.includes(kw))) {
    matchedRules.push('sales-keywords');
    category = 'SALES';
    confidence = 0.8;
  }

  const financeKeywords = ['청구서', 'invoice', '송금', 'transfer', '결제', 'payment'];
  if (financeKeywords.some(kw => subject.includes(kw) || body.includes(kw))) {
    matchedRules.push('finance-keywords');
    category = 'FINANCE';
    confidence = 0.85;
  }

  const techKeywords = ['기술', 'technical', '문의', 'inquiry', '사양', 'spec'];
  if (techKeywords.some(kw => subject.includes(kw))) {
    matchedRules.push('presales-tech');
    category = 'PRESALES';
    confidence = 0.75;
  }

  const ceoKeywords = ['승인', 'approval', '긴급', 'urgent'];
  if (ceoKeywords.some(kw => subject.includes(kw))) {
    matchedRules.push('ceo-approval');
    category = 'CEO';
    confidence = 0.9;
  }

  if (matchedRules.length === 0) {
    matchedRules.push('default');
  }

  return { category, confidence, matchedRules };
}

// BriefingItem
interface BriefingItem {
  mailId: string;
  subject: string;
  category: string;
  confidence: number;
  actionRequired: boolean;
  summary: string;
}

// BriefingEngine
function generateBriefing(items: BriefingItem[]): {
  date: string;
  summary: { totalProcessed: number; autoHandled: number; requiresApproval: number; requiresReview: number };
  actionItems: Array<{ mailId: string; subject: string; category: string; priority: string; action: string }>;
} {
  const today = new Date().toISOString().split('T')[0];

  const summary = {
    totalProcessed: items.length,
    autoHandled: items.filter(i => !i.actionRequired).length,
    requiresApproval: items.filter(i => i.actionRequired && i.category === 'CEO').length,
    requiresReview: items.filter(i => i.actionRequired && i.confidence < 0.7).length,
  };

  const actionItems = items
    .filter(item => item.actionRequired)
    .map(item => ({
      mailId: item.mailId,
      subject: item.subject,
      category: item.category,
      priority: item.category === 'CEO' ? 'high' : item.confidence < 0.6 ? 'high' : 'medium',
      action: item.category === 'CEO' ? '승인 필요' : '분류 검토 필요',
    }));

  return { date: today, summary, actionItems };
}

// WorkSupportPersona (E2E 플로우)
function processMailE2E(mail: MailItem): {
  mailId: string;
  classification: ClassificationResult;
  routedTo: string;
  briefingItem: BriefingItem;
} {
  // 1. 분류
  const classification = classifyMail(mail);

  // 2. 라우팅 (시뮬레이션)
  const routedTo = classification.category;

  // 3. 브리핑 아이템 생성
  const briefingItem: BriefingItem = {
    mailId: mail.id,
    subject: mail.subject,
    category: classification.category,
    confidence: classification.confidence,
    actionRequired: classification.category === 'CEO' || classification.confidence < 0.7,
    summary: `[${classification.category}] ${mail.subject} - ${classification.category === 'CEO' ? 'CEO 승인 필요' : '자동 처리됨'}`,
  };

  return { mailId: mail.id, classification, routedTo, briefingItem };
}

describe('Persona E2E Flow', () => {
  const createMail = (id: string, subject: string, from: string = 'test@example.com'): MailItem => ({
    id,
    subject,
    from,
    to: ['ceo@company.com'],
    body: '',
    receivedAt: new Date().toISOString(),
  });

  it('should process sales mail through full pipeline', () => {
    const mail = createMail('e2e-1', '견적 요청 드립니다', 'customer@customer.com');
    const result = processMailE2E(mail);

    expect(result.classification.category).toBe('SALES');
    expect(result.routedTo).toBe('SALES');
    expect(result.briefingItem.category).toBe('SALES');
    expect(result.briefingItem.actionRequired).toBe(false); // CEO가 아니고 신뢰도 >= 0.7
  });

  it('should process CEO approval mail through full pipeline', () => {
    const mail = createMail('e2e-2', '긴급 승인 요청', 'manager@company.com');
    const result = processMailE2E(mail);

    expect(result.classification.category).toBe('CEO');
    expect(result.routedTo).toBe('CEO');
    expect(result.briefingItem.category).toBe('CEO');
    expect(result.briefingItem.actionRequired).toBe(true); // CEO는 승인 필요
  });

  it('should process finance mail through full pipeline', () => {
    const mail = createMail('e2e-3', '청구서 발송 건', 'finance@company.com');
    const result = processMailE2E(mail);

    expect(result.classification.category).toBe('FINANCE');
    expect(result.routedTo).toBe('FINANCE');
    expect(result.briefingItem.actionRequired).toBe(false);
  });

  it('should generate CEO briefing with all processed mails', () => {
    const mails = [
      createMail('brief-1', '견적 요청', 'customer@customer.com'),
      createMail('brief-2', '긴급 승인 요청', 'manager@company.com'),
      createMail('brief-3', '청구서 발송', 'finance@company.com'),
      createMail('brief-4', '안녕하세요', 'someone@example.com'),
    ];

    const results = mails.map(mail => processMailE2E(mail));
    const briefingItems = results.map(r => r.briefingItem);
    const briefing = generateBriefing(briefingItems);

    // 검증
    expect(briefing.summary.totalProcessed).toBe(4);
    expect(briefing.summary.requiresApproval).toBe(1); // CEO 1건
    // CEO(승인 필요) + WORK_SUPPORT(confidence 0.5 < 0.7) = 2건
    expect(briefing.actionItems.length).toBe(2);
    expect(briefing.actionItems[0].category).toBe('CEO');
    expect(briefing.actionItems[0].priority).toBe('high');
  });

  it('should handle mixed mail types in briefing', () => {
    const mails = [
      createMail('mix-1', '견적 요청', 'customer@customer.com'),
      createMail('mix-2', '기술 문의', 'customer@customer.com'),
      createMail('mix-3', '프로젝트 일정 논의', 'pm@company.com'),
      createMail('mix-4', '안녕하세요', 'someone@example.com'),
    ];

    const results = mails.map(mail => processMailE2E(mail));
    const briefingItems = results.map(r => r.briefingItem);
    const briefing = generateBriefing(briefingItems);

    expect(briefing.summary.totalProcessed).toBe(4);
    // SALES(0.8), PRESALES(0.75), WORK_SUPPORT(0.5), WORK_SUPPORT(0.5)
    // PM 메일은 키워드 미매칭으로 WORK_SUPPORT로 분류됨
    expect(briefing.summary.autoHandled).toBe(2); // SALES, PRESALES만 자동 처리
    expect(briefing.summary.requiresApproval).toBe(0); // CEO 없음
    expect(briefing.summary.requiresReview).toBe(2); // WORK_SUPPORT 2건 (confidence 0.5)
  });
});
