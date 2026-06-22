export type OpportunitySignal = {
  customerName: string;
  level: 'HIGH' | 'MEDIUM' | 'LOW';
  signals: string[];
  recommendedAction: string;
};

type CustomerLike = {
  id: string;
  name: string;
  opportunity: string;
  status: string;
};

type ProjectLike = {
  customerId: string | null;
  status: string;
};

type MailItemLike = {
  customerId: string | null;
};

type Input = {
  customers: CustomerLike[];
  projects: ProjectLike[];
  mailItems: MailItemLike[];
};

export function evaluateOpportunities(input: Input): OpportunitySignal[] {
  const results: OpportunitySignal[] = [];

  for (const customer of input.customers) {
    const signals: string[] = [];
    let score = 0;

    if (customer.opportunity === 'HIGH') {
      signals.push('고객 기회 HIGH');
      score += 2;
    }
    if (customer.status === 'ACTIVE') {
      signals.push('활성 고객');
      score += 1;
    }

    const relatedProjects = input.projects.filter((p) => p.customerId === customer.id);
    if (relatedProjects.some((p) => p.status === 'NEW_LEAD')) {
      signals.push('신규 리드 프로젝트');
      score += 1;
    }

    const relatedMail = input.mailItems.filter((m) => m.customerId === customer.id);
    if (relatedMail.length > 0) {
      signals.push(`메일 신호 ${relatedMail.length}건`);
      score += 1;
    }

    if (signals.length === 0) continue;

    results.push({
      customerName: customer.name,
      level: score >= 3 ? 'HIGH' : score >= 2 ? 'MEDIUM' : 'LOW',
      signals,
      recommendedAction:
        score >= 3 ? '프리세일즈 미팅 제안' : '메일 회신 및 자료 요청',
    });
  }

  return results.sort((a, b) => {
    const order = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    return order[a.level] - order[b.level];
  });
}
