/**
 * FinancePersona - 재무 페르소나
 * 
 * 청구서 등록, 비용 기록, 부가세 계산을 담당한다.
 */

import { type MailItem, type ClassificationResult } from '../mail/classifier';

// 청구서 인터페이스
export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  amount: number;
  vat: number;
  totalAmount: number;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
  dueDate: string;
  createdAt: string;
}

// 비용 인터페이스
export interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  vat: number;
  totalAmount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

// 부가세 계산 결과
export interface VATResult {
  subtotal: number;
  vatAmount: number;
  total: number;
  rate: number;
}

// 재무 처리 결과
export interface FinanceResult {
  mailId: string;
  invoice: Invoice | null;
  expense: Expense | null;
  action: 'INVOICE_REGISTERED' | 'EXPENSE_RECORDED' | 'VAT_CALCULATED' | 'NO_ACTION';
  timestamp: string;
}

/**
 * 재무 페르소나
 */
export class FinancePersona {
  private invoices: Map<string, Invoice> = new Map();
  private expenses: Map<string, Expense> = new Map();

  /**
   * 메일 처리
   */
  async processMail(mail: MailItem, classification: ClassificationResult): Promise<FinanceResult> {
    console.log(`[Finance] Processing mail: ${mail.id} - ${mail.subject}`);

    // 메일 유형에 따른 처리
    if (this.isInvoiceMail(mail)) {
      return this.processInvoiceMail(mail);
    } else if (this.isExpenseMail(mail)) {
      return this.processExpenseMail(mail);
    }

    return {
      mailId: mail.id,
      invoice: null,
      expense: null,
      action: 'NO_ACTION',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 청구서 메일 처리
   */
  private async processInvoiceMail(mail: MailItem): Promise<FinanceResult> {
    const amount = this.extractAmount(mail.body);
    const vatResult = this.calculateVAT(amount);

    const invoice: Invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber: `INV-${Date.now()}`,
      customerId: this.extractCustomerId(mail.from),
      amount,
      vat: vatResult.vatAmount,
      totalAmount: vatResult.total,
      status: 'PENDING',
      dueDate: this.calculateDueDate(),
      createdAt: new Date().toISOString(),
    };

    this.invoices.set(invoice.id, invoice);
    console.log(`[Finance] Invoice registered: ${invoice.invoiceNumber}`);

    return {
      mailId: mail.id,
      invoice,
      expense: null,
      action: 'INVOICE_REGISTERED',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 비용 메일 처리
   */
  private async processExpenseMail(mail: MailItem): Promise<FinanceResult> {
    const amount = this.extractAmount(mail.body);
    const vatResult = this.calculateVAT(amount);

    const expense: Expense = {
      id: `exp-${Date.now()}`,
      category: this.categorizeExpense(mail.subject),
      description: mail.subject,
      amount,
      vat: vatResult.vatAmount,
      totalAmount: vatResult.total,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    this.expenses.set(expense.id, expense);
    console.log(`[Finance] Expense recorded: ${expense.id}`);

    return {
      mailId: mail.id,
      invoice: null,
      expense,
      action: 'EXPENSE_RECORDED',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 부가세 계산 (10%)
   */
  calculateVAT(amount: number, rate: number = 0.1): VATResult {
    const vatAmount = Math.round(amount * rate);
    return {
      subtotal: amount,
      vatAmount,
      total: amount + vatAmount,
      rate,
    };
  }

  /**
   * 청구서 메일 여부 확인
   */
  private isInvoiceMail(mail: MailItem): boolean {
    const invoiceKeywords = ['청구서', 'invoice', '세금계산서', 'tax invoice'];
    const text = `${mail.subject} ${mail.body}`.toLowerCase();
    return invoiceKeywords.some(kw => text.includes(kw));
  }

  /**
   * 비용 메일 여부 확인
   */
  private isExpenseMail(mail: MailItem): boolean {
    const expenseKeywords = ['비용', 'expense', '지출', 'expenditure', '영수증', 'receipt'];
    const text = `${mail.subject} ${mail.body}`.toLowerCase();
    return expenseKeywords.some(kw => text.includes(kw));
  }

  /**
   * 금액 추출
   */
  private extractAmount(body: string): number {
    const amountMatch = body.match(/(\d{1,3}(,\d{3})*(만|억)?원?)/);
    if (amountMatch) {
      const cleaned = amountMatch[1].replace(/[,원]/g, '');
      let amount = parseInt(cleaned, 10);
      if (amountMatch[3] === '만') amount *= 10000;
      if (amountMatch[3] === '억') amount *= 100000000;
      return amount;
    }
    return 0;
  }

  /**
   * 고객 ID 추출
   */
  private extractCustomerId(email: string): string {
    return email.split('@')[0];
  }

  /**
   * 만기일 계산 (30일 후)
   */
  private calculateDueDate(): string {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);
    return dueDate.toISOString();
  }

  /**
   * 비용 카테고리 분류
   */
  private categorizeExpense(subject: string): string {
    const categories: Record<string, string[]> = {
      '식비': ['식사', '점심', '저녁', '회식'],
      '교통비': ['택시', '버스', '지하철', '주유'],
      '사무용품': ['문구', '용지', '토너'],
      '회의비': ['회의', '미팅', '커피'],
    };

    const subjectLower = subject.toLowerCase();
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(kw => subjectLower.includes(kw))) {
        return category;
      }
    }

    return '기타';
  }

  /**
   * 청구서 목록 조회
   */
  getInvoices(): Invoice[] {
    return Array.from(this.invoices.values());
  }

  /**
   * 비용 목록 조회
   */
  getExpenses(): Expense[] {
    return Array.from(this.expenses.values());
  }
}
