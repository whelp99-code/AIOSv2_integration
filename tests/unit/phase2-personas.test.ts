import { describe, it, expect } from 'vitest';

/**
 * Phase 2 페르소나 테스트: Sales, Finance, Presales, PM
 */

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

// MailClassifier (강화된 규칙)
function classifyMail(mail: MailItem): ClassificationResult {
  const subject = mail.subject.toLowerCase();
  const body = mail.body.toLowerCase();
  const text = `${subject} ${body}`;
  const matchedRules: string[] = [];
  let category: PersonaType = 'WORK_SUPPORT';
  let confidence = 0.5;

  // 영업 규칙
  const salesKeywords = ['견적', 'quote', '제안', 'proposal', '가격', 'price'];
  const salesOppKeywords = ['기회', 'opportunity', '리드', 'lead', '잠재고객', 'prospect'];
  const salesNegoKeywords = ['협상', 'negotiation', '계약', 'contract', '조건', 'terms'];

  if (salesKeywords.some(kw => text.includes(kw))) {
    matchedRules.push('sales-keywords');
    category = 'SALES';
    confidence = 0.8;
  }
  if (salesOppKeywords.some(kw => text.includes(kw))) {
    matchedRules.push('sales-opportunity');
    category = 'SALES';
    confidence = 0.85;
  }
  if (salesNegoKeywords.some(kw => text.includes(kw))) {
    matchedRules.push('sales-negotiation');
    category = 'SALES';
    confidence = 0.9;
  }

  // 재무 규칙
  const financeKeywords = ['청구서', 'invoice', '송금', 'transfer', '결제', 'payment'];
  const financeExpenseKeywords = ['비용', 'expense', '지출', 'expenditure', '영수증', 'receipt'];
  const financeBudgetKeywords = ['예산', 'budget', '비용절감', 'cost saving', '투자', 'investment'];

  if (financeKeywords.some(kw => text.includes(kw))) {
    matchedRules.push('finance-invoice');
    category = 'FINANCE';
    confidence = 0.85;
  }
  if (financeExpenseKeywords.some(kw => text.includes(kw))) {
    matchedRules.push('finance-expense');
    category = 'FINANCE';
    confidence = 0.8;
  }
  if (financeBudgetKeywords.some(kw => text.includes(kw))) {
    matchedRules.push('finance-budget');
    category = 'FINANCE';
    confidence = 0.75;
  }

  // 프리세일즈 규칙
  const techKeywords = ['기술', 'technical', '문의', 'inquiry', '사양', 'spec'];
  const presalesDemoKeywords = ['데모', 'demo', '시연', 'presentation', 'POC', 'pilot'];
  const presalesSolutionKeywords = ['솔루션', 'solution', '아키텍처', 'architecture', '설계', 'design'];

  if (techKeywords.some(kw => text.includes(kw))) {
    matchedRules.push('presales-tech-inquiry');
    category = 'PRESALES';
    confidence = 0.75;
  }
  if (presalesDemoKeywords.some(kw => text.includes(kw))) {
    matchedRules.push('presales-demo');
    category = 'PRESALES';
    confidence = 0.85;
  }
  if (presalesSolutionKeywords.some(kw => text.includes(kw))) {
    matchedRules.push('presales-solution');
    category = 'PRESALES';
    confidence = 0.8;
  }

  // PM 규칙
  const pmKeywords = ['프로젝트', 'project', '일정', 'schedule', '마감', 'deadline', '회의', 'meeting'];
  const pmTaskKeywords = ['작업', 'task', '할당', 'assign', '이슈', 'issue', '버그', 'bug'];
  const pmMilestoneKeywords = ['마일스톤', 'milestone', '단계', 'phase', '릴리스', 'release'];

  if (pmKeywords.some(kw => text.includes(kw))) {
    matchedRules.push('pm-project');
    category = 'PM';
    confidence = 0.7;
  }
  if (pmTaskKeywords.some(kw => text.includes(kw))) {
    matchedRules.push('pm-task');
    category = 'PM';
    confidence = 0.75;
  }
  if (pmMilestoneKeywords.some(kw => text.includes(kw))) {
    matchedRules.push('pm-milestone');
    category = 'PM';
    confidence = 0.8;
  }

  // CEO 규칙
  const ceoKeywords = ['승인', 'approval', '긴급', 'urgent'];
  if (ceoKeywords.some(kw => text.includes(kw))) {
    matchedRules.push('ceo-approval');
    category = 'CEO';
    confidence = 0.9;
  }

  if (matchedRules.length === 0) {
    matchedRules.push('default');
  }

  return { category, confidence, matchedRules };
}

// SalesPersona 시뮬레이션
interface Customer {
  id: string;
  name: string;
  email: string;
  company: string;
}

interface Opportunity {
  id: string;
  customerId: string;
  title: string;
  amount: number;
  stage: string;
}

function processSalesMail(mail: MailItem): {
  customer: Customer | null;
  opportunity: Opportunity | null;
  action: string;
} {
  // 고객 매칭 시뮬레이션
  const customerDomains = ['@customer.com', '@client.com', '@partner.co.kr'];
  let customer: Customer | null = null;

  for (const domain of customerDomains) {
    if (mail.from.toLowerCase().includes(domain.replace('@', ''))) {
      customer = {
        id: `cust-${mail.from.split('@')[0]}`,
        name: mail.from.split('@')[0],
        email: mail.from,
        company: domain.replace('@', '').split('.')[0],
      };
      break;
    }
  }

  // 기회 생성
  let opportunity: Opportunity | null = null;
  if (customer) {
    opportunity = {
      id: `opp-${Date.now()}`,
      customerId: customer.id,
      title: mail.subject,
      amount: 1000000,
      stage: 'LEAD',
    };
  }

  return {
    customer,
    opportunity,
    action: opportunity ? 'OPPORTUNITY_CREATED' : customer ? 'CUSTOMER_MATCHED' : 'NO_ACTION',
  };
}

// FinancePersona 시뮬레이션
interface Invoice {
  id: string;
  amount: number;
  vat: number;
  totalAmount: number;
  status: string;
}

function processFinanceMail(mail: MailItem): {
  invoice: Invoice | null;
  action: string;
} {
  const financeKeywords = ['청구서', 'invoice', '세금계산서', 'tax invoice'];
  const text = `${mail.subject} ${mail.body}`.toLowerCase();

  if (financeKeywords.some(kw => text.includes(kw))) {
    const amount = 1000000;
    const vat = Math.round(amount * 0.1);
    return {
      invoice: {
        id: `inv-${Date.now()}`,
        amount,
        vat,
        totalAmount: amount + vat,
        status: 'PENDING',
      },
      action: 'INVOICE_REGISTERED',
    };
  }

  return { invoice: null, action: 'NO_ACTION' };
}

// PresalesPersona 시뮬레이션
interface TechReview {
  id: string;
  inquiryType: string;
  complexity: string;
  findings: string[];
}

function processPresalesMail(mail: MailItem): {
  review: TechReview | null;
  action: string;
} {
  const techKeywords = ['기술', 'technical', '문의', 'inquiry', '사양', 'spec', '데모', 'demo', 'POC'];
  const text = `${mail.subject} ${mail.body}`.toLowerCase();

  if (techKeywords.some(kw => text.includes(kw))) {
    const findings: string[] = [];
    const techTerms = ['API', 'SDK', 'REST', 'database', 'DB'];
    techTerms.forEach(term => {
      if (text.includes(term.toLowerCase())) {
        findings.push(`${term} 관련 요구사항 확인됨`);
      }
    });

    return {
      review: {
        id: `review-${Date.now()}`,
        inquiryType: text.includes('사양') || text.includes('spec') ? 'PRODUCT_SPEC' : 'GENERAL',
        complexity: text.includes('integration') || text.includes('migration') ? 'HIGH' : 'LOW',
        findings: findings.length > 0 ? findings : ['구체적 기술 요구사항 없음'],
      },
      action: 'TECH_REVIEWED',
    };
  }

  return { review: null, action: 'NO_ACTION' };
}

// PMPersona 시뮬레이션
interface Project {
  id: string;
  name: string;
  status: string;
  progress: number;
}

interface Task {
  id: string;
  projectId: string;
  title: string;
  status: string;
}

function processPMMail(mail: MailItem): {
  project: Project | null;
  task: Task | null;
  action: string;
} {
  const pmKeywords = ['프로젝트', 'project', '일정', 'schedule', '마감', 'deadline', '작업', 'task'];
  const text = `${mail.subject} ${mail.body}`.toLowerCase();

  if (pmKeywords.some(kw => text.includes(kw))) {
    // 프로젝트 생성
    const project: Project = {
      id: `proj-${Date.now()}`,
      name: mail.subject.substring(0, 50),
      status: 'PLANNING',
      progress: 0,
    };

    // 작업 생성 (작업 관련 키워드가 있는 경우)
    let task: Task | null = null;
    if (text.includes('작업') || text.includes('task') || text.includes('할당')) {
      task = {
        id: `task-${Date.now()}`,
        projectId: project.id,
        title: mail.subject,
        status: 'TODO',
      };
    }

    return {
      project,
      task,
      action: task ? 'TASK_CREATED' : 'PROJECT_CREATED',
    };
  }

  return { project: null, task: null, action: 'NO_ACTION' };
}

describe('Phase 2 Personas', () => {
  const createMail = (id: string, subject: string, from: string = 'test@example.com', body: string = ''): MailItem => ({
    id,
    subject,
    from,
    to: ['ceo@company.com'],
    body,
    receivedAt: new Date().toISOString(),
  });

  describe('MailClassifier Enhanced Rules', () => {
    it('should classify sales opportunity mail', () => {
      const mail = createMail('sales-1', '새로운 기회 발견', 'customer@customer.com');
      const result = classifyMail(mail);
      expect(result.category).toBe('SALES');
      expect(result.matchedRules).toContain('sales-opportunity');
      expect(result.confidence).toBe(0.85);
    });

    it('should classify sales negotiation mail', () => {
      const mail = createMail('sales-2', '계약 조건 협의', 'customer@customer.com');
      const result = classifyMail(mail);
      expect(result.category).toBe('SALES');
      expect(result.matchedRules).toContain('sales-negotiation');
      expect(result.confidence).toBe(0.9);
    });

    it('should classify finance expense mail', () => {
      const mail = createMail('fin-1', '영수증 제출', 'employee@company.com');
      const result = classifyMail(mail);
      expect(result.category).toBe('FINANCE');
      expect(result.matchedRules).toContain('finance-expense');
      expect(result.confidence).toBe(0.8);
    });

    it('should classify finance budget mail', () => {
      const mail = createMail('fin-2', '2026년 예산 계획', 'cfo@company.com');
      const result = classifyMail(mail);
      expect(result.category).toBe('FINANCE');
      expect(result.matchedRules).toContain('finance-budget');
      expect(result.confidence).toBe(0.75);
    });

    it('should classify presales demo mail', () => {
      const mail = createMail('pre-1', '데모 요청', 'customer@customer.com');
      const result = classifyMail(mail);
      expect(result.category).toBe('PRESALES');
      expect(result.matchedRules).toContain('presales-demo');
      expect(result.confidence).toBe(0.85);
    });

    it('should classify presales solution mail', () => {
      const mail = createMail('pre-2', '솔루션 설계 문의', 'customer@customer.com');
      const result = classifyMail(mail);
      expect(result.category).toBe('PRESALES');
      expect(result.matchedRules).toContain('presales-solution');
      expect(result.confidence).toBe(0.8);
    });

    it('should classify PM task mail', () => {
      const mail = createMail('pm-1', '작업 할당 요청', 'pm@company.com');
      const result = classifyMail(mail);
      expect(result.category).toBe('PM');
      expect(result.matchedRules).toContain('pm-task');
      expect(result.confidence).toBe(0.75);
    });

    it('should classify PM milestone mail', () => {
      const mail = createMail('pm-2', 'Phase 1 마일스톤 달성', 'pm@company.com');
      const result = classifyMail(mail);
      expect(result.category).toBe('PM');
      expect(result.matchedRules).toContain('pm-milestone');
      expect(result.confidence).toBe(0.8);
    });
  });

  describe('SalesPersona', () => {
    it('should match customer by domain', () => {
      const mail = createMail('s-1', '견적 요청', 'kim@customer.com');
      const result = processSalesMail(mail);
      expect(result.customer).not.toBeNull();
      expect(result.opportunity).not.toBeNull();
      expect(result.action).toBe('OPPORTUNITY_CREATED');
    });

    it('should not match unknown domain', () => {
      const mail = createMail('s-2', '견적 요청', 'unknown@example.com');
      const result = processSalesMail(mail);
      expect(result.customer).toBeNull();
      expect(result.action).toBe('NO_ACTION');
    });
  });

  describe('FinancePersona', () => {
    it('should register invoice from invoice mail', () => {
      const mail = createMail('f-1', '청구서 발송', 'finance@company.com');
      const result = processFinanceMail(mail);
      expect(result.invoice).not.toBeNull();
      expect(result.invoice!.vat).toBe(100000); // 10% VAT
      expect(result.action).toBe('INVOICE_REGISTERED');
    });

    it('should not process non-finance mail', () => {
      const mail = createMail('f-2', '안녕하세요', 'someone@example.com');
      const result = processFinanceMail(mail);
      expect(result.invoice).toBeNull();
      expect(result.action).toBe('NO_ACTION');
    });
  });

  describe('PresalesPersona', () => {
    it('should review technical inquiry', () => {
      const mail = createMail('p-1', '기술 문의', 'customer@customer.com', 'API 연동 관련 질문');
      const result = processPresalesMail(mail);
      expect(result.review).not.toBeNull();
      expect(result.review!.inquiryType).toBe('GENERAL');
      expect(result.action).toBe('TECH_REVIEWED');
    });

    it('should review product spec inquiry', () => {
      const mail = createMail('p-2', '사양 문의', 'customer@customer.com');
      const result = processPresalesMail(mail);
      expect(result.review).not.toBeNull();
      expect(result.review!.inquiryType).toBe('PRODUCT_SPEC');
    });
  });

  describe('PMPersona', () => {
    it('should create project from project mail', () => {
      const mail = createMail('pm-1', '프로젝트 시작', 'pm@company.com');
      const result = processPMMail(mail);
      expect(result.project).not.toBeNull();
      expect(result.action).toBe('PROJECT_CREATED');
    });

    it('should create task from task mail', () => {
      const mail = createMail('pm-2', '작업 할당', 'pm@company.com');
      const result = processPMMail(mail);
      expect(result.project).not.toBeNull();
      expect(result.task).not.toBeNull();
      expect(result.task!.status).toBe('TODO');
      expect(result.action).toBe('TASK_CREATED');
    });
  });
});
