/**
 * SalesPersona - 영업 페르소나
 * 
 * 고객 관리, 기회 추적, 제안서 생성을 담당한다.
 */

import { type MailItem, type ClassificationResult } from '../mail/classifier';

// 고객 인터페이스
export interface Customer {
  id: string;
  name: string;
  email: string;
  company: string;
  status: 'ACTIVE' | 'PROSPECT' | 'PARTNER';
  createdAt: string;
}

// 기회 인터페이스
export interface Opportunity {
  id: string;
  customerId: string;
  title: string;
  amount: number;
  stage: 'LEAD' | 'QUALIFICATION' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST';
  probability: number;
  createdAt: string;
}

// 제안서 인터페이스
export interface Proposal {
  id: string;
  opportunityId: string;
  title: string;
  content: string;
  status: 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED';
  createdAt: string;
}

// 영업 처리 결과
export interface SalesResult {
  mailId: string;
  customer: Customer | null;
  opportunity: Opportunity | null;
  proposal: Proposal | null;
  action: 'CUSTOMER_MATCHED' | 'OPPORTUNITY_CREATED' | 'PROPOSAL_DRAFTED' | 'NO_ACTION';
  timestamp: string;
}

/**
 * 영업 페르소나
 */
export class SalesPersona {
  private customers: Map<string, Customer> = new Map();
  private opportunities: Map<string, Opportunity> = new Map();

  constructor() {
    this.initializeSampleData();
  }

  /**
   * 샘플 고객 데이터 초기화
   */
  private initializeSampleData(): void {
    const sampleCustomers: Customer[] = [
      { id: 'cust-1', name: '김철수', email: 'kim@customer.com', company: 'ABC Corp', status: 'ACTIVE', createdAt: new Date().toISOString() },
      { id: 'cust-2', name: '이영희', email: 'lee@client.com', company: 'XYZ Inc', status: 'PROSPECT', createdAt: new Date().toISOString() },
      { id: 'cust-3', name: '박지민', email: 'park@partner.co.kr', company: 'Partner Co', status: 'PARTNER', createdAt: new Date().toISOString() },
    ];

    sampleCustomers.forEach(c => this.customers.set(c.email, c));
  }

  /**
   * 메일 처리
   */
  async processMail(mail: MailItem, classification: ClassificationResult): Promise<SalesResult> {
    console.log(`[Sales] Processing mail: ${mail.id} - ${mail.subject}`);

    // 1. 고객 매칭
    const customer = this.matchCustomer(mail);

    // 2. 기회 생성 (고객이 매칭된 경우)
    let opportunity: Opportunity | null = null;
    if (customer) {
      opportunity = this.createOpportunity(mail, customer);
    }

    // 3. 제안서 생성 (기회가 생성된 경우)
    let proposal: Proposal | null = null;
    if (opportunity) {
      proposal = this.generateProposal(opportunity, mail);
    }

    // 4. 액션 결정
    let action: SalesResult['action'] = 'NO_ACTION';
    if (proposal) action = 'PROPOSAL_DRAFTED';
    else if (opportunity) action = 'OPPORTUNITY_CREATED';
    else if (customer) action = 'CUSTOMER_MATCHED';

    return {
      mailId: mail.id,
      customer,
      opportunity,
      proposal,
      action,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 이메일 주소에서 도메인 추출
   */
  private extractEmailDomain(email: string): string | null {
    const parts = email.toLowerCase().trim().split('@');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      return null;
    }
    return parts[1];
  }

  /**
   * 고객 매칭
   */
  private matchCustomer(mail: MailItem): Customer | null {
    // 발신자 이메일로 고객 검색
    const customer = this.customers.get(mail.from.toLowerCase());
    if (customer) {
      console.log(`[Sales] Customer matched: ${customer.name} (${customer.company})`);
      return customer;
    }

    // 도메인 기반 검색 (정확한 도메인 일치)
    const fromDomain = this.extractEmailDomain(mail.from);
    if (fromDomain) {
      for (const [, customer] of this.customers) {
        const customerDomain = this.extractEmailDomain(customer.email);
        if (customerDomain && fromDomain === customerDomain) {
          console.log(`[Sales] Customer matched by domain: ${customer.name}`);
          return customer;
        }
      }
    }

    return null;
  }

  /**
   * 기회 생성
   */
  private createOpportunity(mail: MailItem, customer: Customer): Opportunity {
    const opportunity: Opportunity = {
      id: `opp-${Date.now()}`,
      customerId: customer.id,
      title: `기회: ${mail.subject}`,
      amount: this.extractAmount(mail.body),
      stage: 'LEAD',
      probability: 10,
      createdAt: new Date().toISOString(),
    };

    this.opportunities.set(opportunity.id, opportunity);
    console.log(`[Sales] Opportunity created: ${opportunity.id}`);

    return opportunity;
  }

  /**
   * 제안서 생성
   */
  private generateProposal(opportunity: Opportunity, mail: MailItem): Proposal {
    const proposal: Proposal = {
      id: `prop-${Date.now()}`,
      opportunityId: opportunity.id,
      title: `제안서: ${mail.subject}`,
      content: this.generateProposalContent(mail, opportunity),
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
    };

    console.log(`[Sales] Proposal drafted: ${proposal.id}`);
    return proposal;
  }

  /**
   * 제안서 내용 생성
   */
  private generateProposalContent(mail: MailItem, opportunity: Opportunity): string {
    return `
# 제안서: ${mail.subject}

## 1. 개요
- 고객: ${opportunity.customerId}
- 예상 금액: ${opportunity.amount.toLocaleString()}원
- 기회 단계: ${opportunity.stage}

## 2. 고객 요청 사항
${mail.body || '상세 내용 없음'}

## 3. 제안 솔루션
[솔루션 상세 내용]

## 4. 가격 제안
[가격 상세]

## 5. 일정
[구현 일정]
    `.trim();
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
   * 고객 목록 조회
   */
  getCustomers(): Customer[] {
    return Array.from(this.customers.values());
  }

  /**
   * 기회 목록 조회
   */
  getOpportunities(): Opportunity[] {
    return Array.from(this.opportunities.values());
  }
}
