import { describe, it, expect } from 'vitest';
import { MailClassifier, type MailItem } from '../classifier';

describe('MailClassifier', () => {
  const classifier = new MailClassifier();

  const createMail = (subject: string, from: string = 'test@example.com', body: string = ''): MailItem => ({
    id: `mail-${Date.now()}`,
    subject,
    from,
    to: ['ceo@company.com'],
    body,
    receivedAt: new Date().toISOString(),
  });

  it('should classify sales-related mail', () => {
    const mail = createMail('견적 요청 드립니다', 'customer@customer.com');
    const result = classifier.classify(mail);

    expect(result.category).toBe('SALES');
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    expect(result.matchedRules.length).toBeGreaterThan(0);
  });

  it('should classify finance-related mail', () => {
    const mail = createMail('청구서 발송 건');
    const result = classifier.classify(mail);

    expect(result.category).toBe('FINANCE');
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('should classify technical inquiry', () => {
    const mail = createMail('기술 문의 드립니다');
    const result = classifier.classify(mail);

    expect(result.category).toBe('PRESALES');
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it('should classify project-related mail', () => {
    const mail = createMail('프로젝트 일정 논의');
    const result = classifier.classify(mail);

    expect(result.category).toBe('PM');
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it('should classify marketing mail', () => {
    const mail = createMail('마케팅 콘텐츠 기획안');
    const result = classifier.classify(mail);

    expect(result.category).toBe('MARKETING');
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it('should classify CEO approval mail', () => {
    const mail = createMail('긴급 승인 요청');
    const result = classifier.classify(mail);

    expect(result.category).toBe('CEO');
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('should default to WORK_SUPPORT for unmatched mail', () => {
    const mail = createMail('안녕하세요');
    const result = classifier.classify(mail);

    expect(result.category).toBe('WORK_SUPPORT');
    expect(result.confidence).toBe(0.5);
  });

  it('should map from IngestionMailCategory', () => {
    expect(classifier.mapFromIngestionCategory('TECH_QUESTION')).toBe('PRESALES');
    expect(classifier.mapFromIngestionCategory('QUOTE_REQUEST')).toBe('SALES');
    expect(classifier.mapFromIngestionCategory('MEETING_FOLLOW_UP')).toBe('PM');
    expect(classifier.mapFromIngestionCategory('UNKNOWN')).toBe('WORK_SUPPORT');
  });

  it('should handle multiple matching rules', () => {
    const mail = createMail('견적 요청 - 기술 검토 필요', 'customer@customer.com', '기술 사양 확인 부탁드립니다');
    const result = classifier.classify(mail);

    // Should match multiple rules
    expect(result.matchedRules.length).toBeGreaterThan(1);
  });
});
