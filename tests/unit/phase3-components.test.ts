import { describe, it, expect } from 'vitest';

/**
 * Phase 3 테스트: Engineer, Marketing, ActionRouter, ApprovalGate, BriefingEngine
 */

// MailClassifier (전체 규칙)
type PersonaType = 'WORK_SUPPORT' | 'SALES' | 'PRESALES' | 'ENGINEER' | 'PM' | 'FINANCE' | 'MARKETING' | 'CEO';

interface MailItem {
  id: string;
  subject: string;
  from: string;
  to: string[];
  body: string;
  receivedAt: string;
}

function classifyMail(mail: MailItem): { category: PersonaType; confidence: number; matchedRules: string[] } {
  const text = `${mail.subject} ${mail.body}`.toLowerCase();
  const matchedRules: string[] = [];
  let category: PersonaType = 'WORK_SUPPORT';
  let confidence = 0.5;

  // 엔지니어 규칙
  if (['코드', 'code', '리뷰', 'review', 'PR', 'pull request'].some(kw => text.includes(kw))) {
    matchedRules.push('engineer-code-review');
    category = 'ENGINEER';
    confidence = 0.8;
  }
  if (['버그', 'bug', '오류', 'error', '수정', 'fix'].some(kw => text.includes(kw))) {
    matchedRules.push('engineer-bug-fix');
    category = 'ENGINEER';
    confidence = 0.85;
  }
  if (['빌드', 'build', '배포', 'deploy', 'CI/CD'].some(kw => text.includes(kw))) {
    matchedRules.push('engineer-build-deploy');
    category = 'ENGINEER';
    confidence = 0.8;
  }

  // 마케팅 규칙
  if (['뉴스레터', 'newsletter', '메일링', 'mailing'].some(kw => text.includes(kw))) {
    matchedRules.push('marketing-newsletter');
    category = 'MARKETING';
    confidence = 0.85;
  }
  if (['브랜드', 'brand', '로고', 'logo', '디자인', 'design'].some(kw => text.includes(kw))) {
    matchedRules.push('marketing-brand');
    category = 'MARKETING';
    confidence = 0.8;
  }
  if (['마케팅', 'marketing', '콘텐츠', 'content'].some(kw => text.includes(kw))) {
    matchedRules.push('marketing-content');
    category = 'MARKETING';
    confidence = 0.75;
  }

  // CEO 규칙
  if (['승인', 'approval', '긴급', 'urgent'].some(kw => text.includes(kw))) {
    matchedRules.push('ceo-approval');
    category = 'CEO';
    confidence = 0.9;
  }

  if (matchedRules.length === 0) matchedRules.push('default');
  return { category, confidence, matchedRules };
}

// ActionRouter 시뮬레이션
interface ActionItem {
  id: string;
  personaType: PersonaType;
  priority: number;
  status: string;
  retryCount: number;
}

const PERSONA_PRIORITY: Record<PersonaType, number> = {
  'CEO': 100, 'FINANCE': 80, 'SALES': 70, 'PRESALES': 60,
  'PM': 50, 'ENGINEER': 40, 'MARKETING': 30, 'WORK_SUPPORT': 20,
};

function createAction(personaType: PersonaType): ActionItem {
  return {
    id: `action-${Date.now()}`,
    personaType,
    priority: PERSONA_PRIORITY[personaType],
    status: 'PENDING',
    retryCount: 0,
  };
}

function sortActionsByPriority(actions: ActionItem[]): ActionItem[] {
  return [...actions].sort((a, b) => b.priority - a.priority);
}

// ApprovalGate 시뮬레이션
function requiresApproval(amount: number): { requiresApproval: boolean; autoApproved: boolean; reason: string } {
  if (amount < 100000) {
    return { requiresApproval: false, autoApproved: true, reason: '10만원 미만 자동 승인' };
  }
  if (amount < 1000000) {
    return { requiresApproval: true, autoApproved: false, reason: '중액 승인 필요' };
  }
  return { requiresApproval: true, autoApproved: false, reason: '고액 CEO 승인 필요' };
}

// BriefingEngine 시뮬레이션
interface BriefingItem {
  mailId: string;
  subject: string;
  category: string;
  confidence: number;
  actionRequired: boolean;
}

function generateBriefing(items: BriefingItem[]) {
  const totalProcessed = items.length;
  const autoHandled = items.filter(i => !i.actionRequired).length;
  const requiresApproval = items.filter(i => i.actionRequired && i.category === 'CEO').length;
  const alerts = items.filter(i => i.confidence < 0.5).length;

  return {
    date: new Date().toISOString().split('T')[0],
    summary: { totalProcessed, autoHandled, requiresApproval, alerts },
    actionItems: items.filter(i => i.actionRequired).map(i => ({
      title: i.subject,
      priority: i.category === 'CEO' ? 'high' : i.confidence < 0.6 ? 'high' : 'medium',
      personaType: i.category,
    })),
    personaStats: calculatePersonaStats(items),
  };
}

function calculatePersonaStats(items: BriefingItem[]) {
  const statsMap = new Map<string, { personaType: string; total: number; success: number }>();
  for (const item of items) {
    const s = statsMap.get(item.category) || { personaType: item.category, total: 0, success: 0 };
    s.total++;
    if (item.confidence >= 0.7) s.success++;
    statsMap.set(item.category, s);
  }
  return Array.from(statsMap.values());
}

describe('Phase 3 Components', () => {
  const createMail = (id: string, subject: string, body: string = ''): MailItem => ({
    id, subject, from: 'test@example.com', to: ['ceo@company.com'], body,
    receivedAt: new Date().toISOString(),
  });

  describe('MailClassifier - Engineer/Marketing Rules', () => {
    it('should classify code review mail', () => {
      const result = classifyMail(createMail('e-1', '코드 리뷰 요청'));
      expect(result.category).toBe('ENGINEER');
      expect(result.matchedRules).toContain('engineer-code-review');
      expect(result.confidence).toBe(0.8);
    });

    it('should classify bug fix mail', () => {
      const result = classifyMail(createMail('e-2', '버그 수정 요청'));
      expect(result.category).toBe('ENGINEER');
      expect(result.matchedRules).toContain('engineer-bug-fix');
      expect(result.confidence).toBe(0.85);
    });

    it('should classify build/deploy mail', () => {
      const result = classifyMail(createMail('e-3', '배포 요청'));
      expect(result.category).toBe('ENGINEER');
      expect(result.matchedRules).toContain('engineer-build-deploy');
      expect(result.confidence).toBe(0.8);
    });

    it('should classify newsletter mail', () => {
      const result = classifyMail(createMail('m-1', '뉴스레터 발송'));
      expect(result.category).toBe('MARKETING');
      expect(result.matchedRules).toContain('marketing-newsletter');
      expect(result.confidence).toBe(0.85);
    });

    it('should classify brand mail', () => {
      const result = classifyMail(createMail('m-2', '로고 디자인 변경'));
      expect(result.category).toBe('MARKETING');
      expect(result.matchedRules).toContain('marketing-brand');
      expect(result.confidence).toBe(0.8);
    });
  });

  describe('ActionRouter - Priority Queue', () => {
    it('should sort actions by priority', () => {
      const actions = [
        createAction('WORK_SUPPORT'),
        createAction('CEO'),
        createAction('SALES'),
        createAction('ENGINEER'),
      ];
      const sorted = sortActionsByPriority(actions);
      expect(sorted[0].personaType).toBe('CEO');
      expect(sorted[1].personaType).toBe('SALES');
      expect(sorted[2].personaType).toBe('ENGINEER');
      expect(sorted[3].personaType).toBe('WORK_SUPPORT');
    });

    it('should have correct priority values', () => {
      expect(PERSONA_PRIORITY.CEO).toBe(100);
      expect(PERSONA_PRIORITY.FINANCE).toBe(80);
      expect(PERSONA_PRIORITY.SALES).toBe(70);
      expect(PERSONA_PRIORITY.ENGINEER).toBe(40);
      expect(PERSONA_PRIORITY.WORK_SUPPORT).toBe(20);
    });
  });

  describe('ApprovalGate - Amount-based', () => {
    it('should auto-approve below 100,000 KRW', () => {
      const result = requiresApproval(50000);
      expect(result.requiresApproval).toBe(false);
      expect(result.autoApproved).toBe(true);
    });

    it('require approval for medium amounts', () => {
      const result = requiresApproval(500000);
      expect(result.requiresApproval).toBe(true);
      expect(result.autoApproved).toBe(false);
    });

    it('require CEO approval for high amounts', () => {
      const result = requiresApproval(5000000);
      expect(result.requiresApproval).toBe(true);
      expect(result.reason).toContain('CEO');
    });
  });

  describe('BriefingEngine - Enhanced', () => {
    it('should generate briefing with persona stats', () => {
      const items: BriefingItem[] = [
        { mailId: '1', subject: '견적 요청', category: 'SALES', confidence: 0.8, actionRequired: false },
        { mailId: '2', subject: '승인 요청', category: 'CEO', confidence: 0.9, actionRequired: true },
        { mailId: '3', subject: '코드 리뷰', category: 'ENGINEER', confidence: 0.75, actionRequired: false },
        { mailId: '4', subject: '뉴스레터', category: 'MARKETING', confidence: 0.85, actionRequired: false },
      ];

      const briefing = generateBriefing(items);

      expect(briefing.summary.totalProcessed).toBe(4);
      expect(briefing.summary.autoHandled).toBe(3);
      expect(briefing.summary.requiresApproval).toBe(1);
      expect(briefing.actionItems.length).toBe(1);
      expect(briefing.actionItems[0].personaType).toBe('CEO');
      expect(briefing.personaStats.length).toBe(4); // SALES, CEO, ENGINEER, MARKETING
    });

    it('should count alerts for low confidence', () => {
      const items: BriefingItem[] = [
        { mailId: '1', subject: '알 수 없는 메일', category: 'WORK_SUPPORT', confidence: 0.3, actionRequired: false },
        { mailId: '2', subject: '정상 메일', category: 'SALES', confidence: 0.8, actionRequired: false },
      ];

      const briefing = generateBriefing(items);
      expect(briefing.summary.alerts).toBe(1); // confidence 0.3 < 0.5
    });
  });
});
