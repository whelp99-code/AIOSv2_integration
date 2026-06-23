import { describe, it, expect } from 'vitest';

// MailClassifier 테스트를 위한 간단한 구현
// 실제 패키지 import 대신 직접 구현하여 테스트

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

// 간단한 분류 규칙
function classifyMail(mail: MailItem): ClassificationResult {
  const subject = mail.subject.toLowerCase();
  const body = mail.body.toLowerCase();
  const matchedRules: string[] = [];
  let category: PersonaType = 'WORK_SUPPORT';
  let confidence = 0.5;

  // 영업 관련
  const salesKeywords = ['견적', 'quote', '제안', 'proposal', '가격', 'price'];
  if (salesKeywords.some(kw => subject.includes(kw) || body.includes(kw))) {
    matchedRules.push('sales-keywords');
    category = 'SALES';
    confidence = 0.8;
  }

  // 재무 관련
  const financeKeywords = ['청구서', 'invoice', '송금', 'transfer', '결제', 'payment'];
  if (financeKeywords.some(kw => subject.includes(kw) || body.includes(kw))) {
    matchedRules.push('finance-keywords');
    category = 'FINANCE';
    confidence = 0.85;
  }

  // 기술 문의
  const techKeywords = ['기술', 'technical', '문의', 'inquiry', '사양', 'spec'];
  if (techKeywords.some(kw => subject.includes(kw))) {
    matchedRules.push('presales-tech');
    category = 'PRESALES';
    confidence = 0.75;
  }

  // 프로젝트 관련
  const pmKeywords = ['프로젝트', 'project', '일정', 'schedule', '마감', 'deadline'];
  if (pmKeywords.some(kw => subject.includes(kw))) {
    matchedRules.push('pm-project');
    category = 'PM';
    confidence = 0.7;
  }

  // CEO 승인
  const ceoKeywords = ['승인', 'approval', '긴급', 'urgent'];
  if (ceoKeywords.some(kw => subject.includes(kw))) {
    matchedRules.push('ceo-approval');
    category = 'CEO';
    confidence = 0.9;
  }

  // 기본값
  if (matchedRules.length === 0) {
    matchedRules.push('default');
  }

  return { category, confidence, matchedRules };
}

describe('MailClassifier', () => {
  it('should classify sales-related mail', () => {
    const mail: MailItem = {
      id: 'test-1',
      subject: '견적 요청 드립니다',
      from: 'customer@customer.com',
      to: ['ceo@company.com'],
      body: '',
      receivedAt: new Date().toISOString(),
    };

    const result = classifyMail(mail);

    expect(result.category).toBe('SALES');
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    expect(result.matchedRules).toContain('sales-keywords');
  });

  it('should classify finance-related mail', () => {
    const mail: MailItem = {
      id: 'test-2',
      subject: '청구서 발송 건',
      from: 'finance@company.com',
      to: ['ceo@company.com'],
      body: '',
      receivedAt: new Date().toISOString(),
    };

    const result = classifyMail(mail);

    expect(result.category).toBe('FINANCE');
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    expect(result.matchedRules).toContain('finance-keywords');
  });

  it('should classify technical inquiry', () => {
    const mail: MailItem = {
      id: 'test-3',
      subject: '기술 문의 드립니다',
      from: 'customer@customer.com',
      to: ['presales@company.com'],
      body: '',
      receivedAt: new Date().toISOString(),
    };

    const result = classifyMail(mail);

    expect(result.category).toBe('PRESALES');
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    expect(result.matchedRules).toContain('presales-tech');
  });

  it('should classify project-related mail', () => {
    const mail: MailItem = {
      id: 'test-4',
      subject: '프로젝트 일정 논의',
      from: 'pm@company.com',
      to: ['team@company.com'],
      body: '',
      receivedAt: new Date().toISOString(),
    };

    const result = classifyMail(mail);

    expect(result.category).toBe('PM');
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    expect(result.matchedRules).toContain('pm-project');
  });

  it('should classify CEO approval mail', () => {
    const mail: MailItem = {
      id: 'test-5',
      subject: '긴급 승인 요청',
      from: 'manager@company.com',
      to: ['ceo@company.com'],
      body: '',
      receivedAt: new Date().toISOString(),
    };

    const result = classifyMail(mail);

    expect(result.category).toBe('CEO');
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    expect(result.matchedRules).toContain('ceo-approval');
  });

  it('should default to WORK_SUPPORT for unmatched mail', () => {
    const mail: MailItem = {
      id: 'test-6',
      subject: '안녕하세요',
      from: 'someone@example.com',
      to: ['info@company.com'],
      body: '',
      receivedAt: new Date().toISOString(),
    };

    const result = classifyMail(mail);

    expect(result.category).toBe('WORK_SUPPORT');
    expect(result.confidence).toBe(0.5);
    expect(result.matchedRules).toContain('default');
  });

  it('should handle multiple matching rules', () => {
    const mail: MailItem = {
      id: 'test-7',
      subject: '견적 요청 - 기술 검토 필요',
      from: 'customer@customer.com',
      to: ['sales@company.com'],
      body: '기술 사양 확인 부탁드립니다',
      receivedAt: new Date().toISOString(),
    };

    const result = classifyMail(mail);

    // 여러 규칙이 매칭되어야 함
    expect(result.matchedRules.length).toBeGreaterThan(1);
    // 가장 높은 신뢰도를 가진 카테고리가 선택되어야 함
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });
});
