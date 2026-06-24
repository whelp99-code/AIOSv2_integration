/**
 * ClassificationBenchmarkRunner
 *
 * Runs the current rule-based MailClassifier against the golden dataset
 * and produces accuracy, macro-F1, confusion matrix, and per-category metrics.
 *
 * Usage:
 *   npx tsx packages/persona/src/mail/benchmark.ts [--golden path] [--output path]
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Types (inline to avoid import issues in CLI) ──────────────────────

type PersonaType =
  | 'WORK_SUPPORT'
  | 'SALES'
  | 'PRESALES'
  | 'ENGINEER'
  | 'PM'
  | 'FINANCE'
  | 'MARKETING'
  | 'CEO';

interface MailItem {
  id: string;
  subject: string;
  from: string;
  to: string[];
  body: string;
  receivedAt: string;
}

interface ClassificationResult {
  category: PersonaType;
  confidence: number;
  matchedRules: string[];
}

interface GoldenMailEntry {
  id: string;
  subject: string;
  from: string;
  to: string[];
  body: string;
  receivedAt: string;
  language: 'ko' | 'en' | 'mixed';
  label: {
    category: PersonaType;
    confidence: number;
    isAmbiguous: boolean;
    alternativeCategory?: PersonaType;
    labeledBy: string;
    reviewedBy: string;
    reviewNotes?: string;
  };
  metadata: {
    source: 'synthetic' | 'real-anonymized';
    difficulty: 'easy' | 'medium' | 'hard';
    conflictZone?: string;
    tags: string[];
  };
}

interface CategoryMetrics {
  precision: number;
  recall: number;
  f1: number;
  support: number;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
}

interface ConfusionEntry {
  predicted: PersonaType;
  actual: PersonaType;
  count: number;
}

interface BaselineReport {
  meta: {
    generatedAt: string;
    classifierVersion: string;
    goldenDatasetVersion: string;
    totalSamples: number;
    evalSamples: number;
    promptDevSamples: number;
  };
  overall: {
    accuracy: number;
    macroPrecision: number;
    macroRecall: number;
    macroF1: number;
    weightedF1: number;
  };
  perCategory: Record<PersonaType, CategoryMetrics>;
  confusionMatrix: ConfusionEntry[];
  disagreementCases: Array<{
    id: string;
    predicted: PersonaType;
    actual: PersonaType;
    confidence: number;
    difficulty: string;
    conflictZone?: string;
  }>;
  conflictZoneAnalysis: Record<string, {
    total: number;
    correct: number;
    accuracy: number;
    mainConfusion: string;
  }>;
  errorBreakdown: {
    byDifficulty: Record<string, { total: number; errors: number; accuracy: number }>;
    byLanguage: Record<string, { total: number; errors: number; accuracy: number }>;
    byAmbiguity: { ambiguous: { total: number; errors: number; accuracy: number }; clear: { total: number; errors: number; accuracy: number } };
  };
}

// ── Inline MailClassifier ─────────────────────────────────────────────
// (duplicated from classifier.ts to keep benchmark self-contained)

interface ClassificationRule {
  name: string;
  category: PersonaType;
  match: (mail: MailItem) => boolean;
  confidence: number;
}

class MailClassifier {
  private rules: ClassificationRule[] = [];

  constructor() {
    this.initializeDefaultRules();
  }

  private initializeDefaultRules(): void {
    this.addRule({
      name: 'sales-opportunity',
      category: 'SALES',
      match: (mail) => {
        const kw = ['기회', 'opportunity', '리드', 'lead', '잠재고객', 'prospect'];
        const text = `${mail.subject} ${mail.body}`.toLowerCase();
        return kw.some(k => text.includes(k));
      },
      confidence: 0.85,
    });

    this.addRule({
      name: 'sales-deal',
      category: 'SALES',
      match: (mail) => {
        const kw = ['매출', '거래처', '영업실적', '매출목표', '수주', '거래', '구매의향', '발주', '주문', '납품'];
        const text = `${mail.subject} ${mail.body}`.toLowerCase();
        return kw.some(k => text.includes(k));
      },
      confidence: 0.85,
    });

    this.addRule({
      name: 'sales-negotiation',
      category: 'SALES',
      match: (mail) => {
        const kw = ['협상', 'negotiation', '계약', 'contract', '조건', 'terms'];
        const text = `${mail.subject} ${mail.body}`.toLowerCase();
        return kw.some(k => text.includes(k));
      },
      confidence: 0.9,
    });
    this.addRule({
      name: 'finance-expense',
      category: 'FINANCE',
      match: (mail) => {
        const kw = ['비용', 'expense', '지출', 'expenditure', '영수증', 'receipt', '정산', 'settlement'];
        const text = `${mail.subject} ${mail.body}`.toLowerCase();
        return kw.some(k => text.includes(k));
      },
      confidence: 0.8,
    });
    this.addRule({
      name: 'finance-budget',
      category: 'FINANCE',
      match: (mail) => {
        const kw = ['예산', 'budget', '비용절감', 'cost saving', '투자', 'investment'];
        const text = `${mail.subject} ${mail.body}`.toLowerCase();
        return kw.some(k => text.includes(k));
      },
      confidence: 0.75,
    });
    this.addRule({
      name: 'presales-demo',
      category: 'PRESALES',
      match: (mail) => {
        const kw = ['데모', 'demo', '시연', 'presentation', 'POC', 'pilot'];
        const text = `${mail.subject} ${mail.body}`.toLowerCase();
        return kw.some(k => text.includes(k));
      },
      confidence: 0.85,
    });
    this.addRule({
      name: 'presales-solution',
      category: 'PRESALES',
      match: (mail) => {
        const kw = ['솔루션', 'solution', '아키텍처', 'architecture', '설계', 'design'];
        const text = `${mail.subject} ${mail.body}`.toLowerCase();
        return kw.some(k => text.includes(k));
      },
      confidence: 0.8,
    });

    this.addRule({
      name: 'presales-rfp',
      category: 'PRESALES',
      match: (mail) => {
        const kw = ['RFP', 'RFI', '고객사', '고객', 'customer', '사전검증', '적합성', '평가', '비교표', 'comparison', 'matrix', '매핑'];
        const text = `${mail.subject} ${mail.body}`.toLowerCase();
        return kw.some(k => text.includes(k));
      },
      confidence: 0.8,
    });

    this.addRule({
      name: 'presales-environment',
      category: 'PRESALES',
      match: (mail) => {
        const kw = ['테스트환경', 'sandbox', '테스트 환경', '환경 설정', 'integration test', '검증환경'];
        const text = `${mail.subject} ${mail.body}`.toLowerCase();
        return kw.some(k => text.includes(k));
      },
      confidence: 0.75,
    });

    this.addRule({
      name: 'pm-task',
      category: 'PM',
      match: (mail) => {
        const kw = ['작업', 'task', '할당', 'assign', '이슈', 'issue', '버그', 'bug'];
        const text = `${mail.subject} ${mail.body}`.toLowerCase();
        return kw.some(k => text.includes(k));
      },
      confidence: 0.75,
    });
    this.addRule({
      name: 'pm-milestone',
      category: 'PM',
      match: (mail) => {
        const kw = ['마일스톤', 'milestone', '단계', 'phase', '릴리스', 'release'];
        const text = `${mail.subject} ${mail.body}`.toLowerCase();
        return kw.some(k => text.includes(k));
      },
      confidence: 0.8,
    });

    this.addRule({
      name: 'pm-planning',
      category: 'PM',
      match: (mail) => {
        const kw = ['스프린트', 'sprint', '스토리', 'story', '백로그', 'backlog', '우선순위', 'priority', '칸반', 'kanban', 'WBS', '산출물', 'deliverable', '요구사항', 'requirement'];
        const text = `${mail.subject} ${mail.body}`.toLowerCase();
        return kw.some(k => text.includes(k));
      },
      confidence: 0.9,
    });

    this.addRule({
      name: 'pm-status',
      category: 'PM',
      match: (mail) => {
        const kw = ['진행상황', '상태보고', '주간보고', '일일보고', 'standup', '회고', 'retrospective', '데모데이', 'planning poker'];
        const text = `${mail.subject} ${mail.body}`.toLowerCase();
        return kw.some(k => text.includes(k));
      },
      confidence: 0.85,
    });

    this.addRule({
      name: 'engineer-code-review',
      category: 'ENGINEER',
      match: (mail) => {
        const kw = ['코드', 'code', '리뷰', 'review', 'PR', 'pull request', 'merge', 'commit'];
        const text = `${mail.subject} ${mail.body}`.toLowerCase();
        return kw.some(k => text.includes(k));
      },
      confidence: 0.8,
    });
    this.addRule({
      name: 'engineer-bug-fix',
      category: 'ENGINEER',
      match: (mail) => {
        const kw = ['버그', 'bug', '오류', 'error', '수정', 'fix', '패치', 'patch'];
        const text = `${mail.subject} ${mail.body}`.toLowerCase();
        return kw.some(k => text.includes(k));
      },
      confidence: 0.85,
    });
    this.addRule({
      name: 'engineer-build-deploy',
      category: 'ENGINEER',
      match: (mail) => {
        const kw = ['빌드', 'build', '배포', 'deploy', 'CI/CD', 'pipeline', '인프라', 'infra'];
        const text = `${mail.subject} ${mail.body}`.toLowerCase();
        return kw.some(k => text.includes(k));
      },
      confidence: 0.8,
    });

    this.addRule({
      name: 'engineer-infra',
      category: 'ENGINEER',
      match: (mail) => {
        const kw = ['컴파일', 'compile', '디버그', 'debug', '테스트케이스', 'testcase', 'API', 'DB', '서버', 'server', '클라이언트', 'client', '캐시', 'cache', '로드밸런서', 'loadbalancer', '쿠버네티스', 'kubernetes', '도커', 'docker'];
        const text = `${mail.subject} ${mail.body}`.toLowerCase();
        return kw.some(k => text.includes(k));
      },
      confidence: 0.9,
    });

    this.addRule({
      name: 'marketing-newsletter',
      category: 'MARKETING',
      match: (mail) => {
        const kw = ['뉴스레터', 'newsletter', '메일링', 'mailing', '구독', 'subscribe'];
        const text = `${mail.subject} ${mail.body}`.toLowerCase();
        return kw.some(k => text.includes(k));
      },
      confidence: 0.85,
    });
    this.addRule({
      name: 'marketing-brand',
      category: 'MARKETING',
      match: (mail) => {
        const kw = ['브랜드', 'brand', '로고', 'logo', '디자인', 'design', '가이드라인', 'guideline'];
        const text = `${mail.subject} ${mail.body}`.toLowerCase();
        return kw.some(k => text.includes(k));
      },
      confidence: 0.8,
    });

    this.addRule({
      name: 'marketing-campaign',
      category: 'MARKETING',
      match: (mail) => {
        const kw = ['캠페인', 'campaign', 'SNS', '소셜', 'social', '광고', 'advertising', '프로모션', 'promotion', '타겟팅', 'targeting', '퍼널', 'funnel', '전환율', 'conversion'];
        const text = `${mail.subject} ${mail.body}`.toLowerCase();
        return kw.some(k => text.includes(k));
      },
      confidence: 0.85,
    });

    this.addRule({
      name: 'sales-keywords',
      category: 'SALES',
      match: (mail) => {
        const kw = ['견적', 'quote', '제안', 'proposal', '가격', 'price', '구매', 'purchase'];
        const text = `${mail.subject} ${mail.body}`.toLowerCase();
        return kw.some(k => text.includes(k));
      },
      confidence: 0.8,
    });
    this.addRule({
      name: 'sales-customer-domain',
      category: 'SALES',
      match: (mail) => {
        const domains = ['@customer.com', '@client.com', '@partner.co.kr'];
        return domains.some(d => mail.from.toLowerCase().includes(d));
      },
      confidence: 0.7,
    });
    this.addRule({
      name: 'presales-tech-inquiry',
      category: 'PRESALES',
      match: (mail) => {
        const kw = ['기술', 'technical', '문의', 'inquiry', '사양', 'spec', '호환', 'compatibility'];
        return kw.some(k => mail.subject.toLowerCase().includes(k));
      },
      confidence: 0.75,
    });
    this.addRule({
      name: 'finance-invoice',
      category: 'FINANCE',
      match: (mail) => {
        const kw = ['청구서', 'invoice', '송금', 'transfer', '결제', 'payment', '세금계산서', 'tax invoice'];
        const text = `${mail.subject} ${mail.body}`.toLowerCase();
        return kw.some(k => text.includes(k));
      },
      confidence: 0.85,
    });
    this.addRule({
      name: 'pm-project',
      category: 'PM',
      match: (mail) => {
        const kw = ['프로젝트', 'project', '일정', 'schedule', '마감', 'deadline', '회의', 'meeting'];
        return kw.some(k => mail.subject.toLowerCase().includes(k));
      },
      confidence: 0.7,
    });
    this.addRule({
      name: 'marketing-content',
      category: 'MARKETING',
      match: (mail) => {
        const kw = ['마케팅', 'marketing', '콘텐츠', 'content', '뉴스레터', 'newsletter', '브랜드', 'brand'];
        return kw.some(k => mail.subject.toLowerCase().includes(k));
      },
      confidence: 0.75,
    });
    this.addRule({
      name: 'ceo-approval',
      category: 'CEO',
      match: (mail) => {
        const kw = ['대표결제', '긴급지시', '긴급결제', '경영방침', '대표이사지시'];
        return kw.some(k => mail.subject.toLowerCase().includes(k));
      },
      confidence: 0.9,
    });

    this.addRule({
      name: 'ceo-directive',
      category: 'CEO',
      match: (mail) => {
        const kw = ['대표이사', 'CEO', '경영진', '경영', '전사적', '전사', '전략적', '전략', '긴급지시', '긴급결제', '이사회', 'board', '경영방침', '비전', 'vision'];
        const text = `${mail.subject} ${mail.body}`.toLowerCase();
        return kw.some(k => text.includes(k));
      },
      confidence: 0.95,
    });

    this.addRule({
      name: 'ceo-report',
      category: 'CEO',
      match: (mail) => {
        const kw = ['대표님', '사장님', '임원', 'executive', '경영보고', '사업보고', '실적보고', '분기보고'];
        const text = `${mail.subject} ${mail.body}`.toLowerCase();
        return kw.some(k => text.includes(k));
      },
      confidence: 0.9,
    });

    this.addRule({
      name: 'work-support-request',
      category: 'WORK_SUPPORT',
      match: (mail) => {
        const kw = ['지원', 'support', '요청', 'request', '확인부탁', '검토부탁', '문의드립니다', '업무지원', '도움', '안내', '공지', '전달드립니다'];
        const text = `${mail.subject} ${mail.body}`.toLowerCase();
        return kw.some(k => text.includes(k));
      },
      confidence: 0.8,
    });

    this.addRule({
      name: 'work-support-admin',
      category: 'WORK_SUPPORT',
      match: (mail) => {
        const kw = ['휴가', '연차', '출장', '근태', '복리후생', '사내', '사규', '규정', '교육', '연수'];
        const text = `${mail.subject} ${mail.body}`.toLowerCase();
        return kw.some(k => text.includes(k));
      },
      confidence: 0.85,
    });

    this.addRule({
      name: 'work-support-default',
      category: 'WORK_SUPPORT',
      match: () => true,
      confidence: 0.3,
    });
  }

  addRule(rule: ClassificationRule): void {
    this.rules.push(rule);
  }

  classify(mail: MailItem): ClassificationResult {
    const matchedRules: string[] = [];
    let bestMatch: { category: PersonaType; confidence: number } | null = null;

    for (const rule of this.rules) {
      if (rule.match(mail)) {
        matchedRules.push(rule.name);
        if (!bestMatch || rule.confidence > bestMatch.confidence) {
          bestMatch = { category: rule.category, confidence: rule.confidence };
        }
      }
    }

    if (!bestMatch) {
      return { category: 'WORK_SUPPORT', confidence: 0.5, matchedRules: ['work-support-default'] };
    }
    return { category: bestMatch.category, confidence: bestMatch.confidence, matchedRules };
  }
}

// ── Metrics Calculator ────────────────────────────────────────────────

const ALL_CATEGORIES: PersonaType[] = [
  'WORK_SUPPORT', 'SALES', 'PRESALES', 'ENGINEER', 'PM', 'FINANCE', 'MARKETING', 'CEO',
];

function calculateMetrics(
  results: Array<{ predicted: PersonaType; actual: PersonaType; entry: GoldenMailEntry; result: ClassificationResult }>,
): BaselineReport {
  const total = results.length;
  const correct = results.filter(r => r.predicted === r.actual).length;
  const accuracy = correct / total;

  // Confusion matrix
  const confusion: Record<string, Record<string, number>> = {};
  for (const cat of ALL_CATEGORIES) {
    confusion[cat] = {};
    for (const cat2 of ALL_CATEGORIES) {
      confusion[cat][cat2] = 0;
    }
  }
  for (const r of results) {
    confusion[r.actual][r.predicted]++;
  }

  // Per-category metrics
  const perCategory: Record<string, CategoryMetrics> = {};
  let macroP = 0, macroR = 0, macroF = 0, weightedF = 0, totalSupport = 0;

  for (const cat of ALL_CATEGORIES) {
    const tp = confusion[cat][cat];
    const fp = ALL_CATEGORIES.reduce((sum, c) => sum + (c !== cat ? confusion[c][cat] : 0), 0);
    const fn = ALL_CATEGORIES.reduce((sum, c) => sum + (c !== cat ? confusion[cat][c] : 0), 0);
    const support = tp + fn;
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    perCategory[cat] = { precision, recall, f1, support, truePositives: tp, falsePositives: fp, falseNegatives: fn };
    macroP += precision;
    macroR += recall;
    macroF += f1;
    weightedF += f1 * support;
    totalSupport += support;
  }

  macroP /= ALL_CATEGORIES.length;
  macroR /= ALL_CATEGORIES.length;
  macroF /= ALL_CATEGORIES.length;
  weightedF /= totalSupport;

  // Confusion matrix as flat array (top entries)
  const confusionMatrix: ConfusionEntry[] = [];
  for (const actual of ALL_CATEGORIES) {
    for (const predicted of ALL_CATEGORIES) {
      if (confusion[actual][predicted] > 0 && actual !== predicted) {
        confusionMatrix.push({ actual, predicted, count: confusion[actual][predicted] });
      }
    }
  }
  confusionMatrix.sort((a, b) => b.count - a.count);

  // Disagreement cases
  const disagreementCases = results
    .filter(r => r.predicted !== r.actual)
    .map(r => ({
      id: r.entry.id,
      predicted: r.predicted,
      actual: r.actual,
      confidence: r.result.confidence,
      difficulty: r.entry.metadata.difficulty,
      conflictZone: r.entry.metadata.conflictZone,
    }));

  // Conflict zone analysis
  const conflictZones: Record<string, { total: number; correct: number }> = {};
  for (const r of results) {
    if (r.entry.metadata.conflictZone) {
      const zone = r.entry.metadata.conflictZone;
      if (!conflictZones[zone]) conflictZones[zone] = { total: 0, correct: 0 };
      conflictZones[zone].total++;
      if (r.predicted === r.actual) conflictZones[zone].correct++;
    }
  }
  const conflictZoneAnalysis: Record<string, { total: number; correct: number; accuracy: number; mainConfusion: string }> = {};
  for (const [zone, data] of Object.entries(conflictZones)) {
    // Find main confusion for this zone
    const zoneResults = results.filter(r => r.entry.metadata.conflictZone === zone && r.predicted !== r.actual);
    const confusionCounts: Record<string, number> = {};
    for (const r of zoneResults) {
      const key = `${r.actual}→${r.predicted}`;
      confusionCounts[key] = (confusionCounts[key] || 0) + 1;
    }
    const mainConfusion = Object.entries(confusionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'none';

    conflictZoneAnalysis[zone] = {
      total: data.total,
      correct: data.correct,
      accuracy: data.total > 0 ? data.correct / data.total : 0,
      mainConfusion,
    };
  }

  // Error breakdown
  const byDifficulty: Record<string, { total: number; errors: number; accuracy: number }> = {};
  for (const d of ['easy', 'medium', 'hard']) {
    const subset = results.filter(r => r.entry.metadata.difficulty === d);
    const errors = subset.filter(r => r.predicted !== r.actual).length;
    byDifficulty[d] = { total: subset.length, errors, accuracy: subset.length > 0 ? (subset.length - errors) / subset.length : 0 };
  }

  const byLanguage: Record<string, { total: number; errors: number; accuracy: number }> = {};
  for (const l of ['ko', 'en', 'mixed']) {
    const subset = results.filter(r => r.entry.language === l);
    const errors = subset.filter(r => r.predicted !== r.actual).length;
    byLanguage[l] = { total: subset.length, errors, accuracy: subset.length > 0 ? (subset.length - errors) / subset.length : 0 };
  }

  const ambiguous = results.filter(r => r.entry.label.isAmbiguous);
  const ambErrors = ambiguous.filter(r => r.predicted !== r.actual).length;
  const clear = results.filter(r => !r.entry.label.isAmbiguous);
  const clearErrors = clear.filter(r => r.predicted !== r.actual).length;

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      classifierVersion: 'rule-baseline-v1',
      goldenDatasetVersion: 'classification-golden-v1',
      totalSamples: total,
      evalSamples: 0,
      promptDevSamples: 0,
    },
    overall: { accuracy, macroPrecision: macroP, macroRecall: macroR, macroF1: macroF, weightedF1: weightedF },
    perCategory: perCategory as Record<PersonaType, CategoryMetrics>,
    confusionMatrix,
    disagreementCases: disagreementCases.slice(0, 50), // top 50
    conflictZoneAnalysis,
    errorBreakdown: {
      byDifficulty,
      byLanguage,
      byAmbiguity: {
        ambiguous: { total: ambiguous.length, errors: ambErrors, accuracy: ambiguous.length > 0 ? (ambiguous.length - ambErrors) / ambiguous.length : 0 },
        clear: { total: clear.length, errors: clearErrors, accuracy: clear.length > 0 ? (clear.length - clearErrors) / clear.length : 0 },
      },
    },
  };
}


// ── 5-Fold Cross-Validation ──────────────────────────────────────────

function runCrossValidation(golden: GoldenMailEntry[], k: number = 5): void {
  // Shuffle data
  const shuffled = [...golden].sort(() => Math.random() - 0.5);
  const foldSize = Math.floor(shuffled.length / k);
  const foldAccuracies: number[] = [];
  const foldF1s: number[] = [];

  console.log(`=== ${k}-Fold Cross-Validation ===`);
  console.log(`Total samples: ${shuffled.length}, Fold size: ${foldSize}\n`);

  for (let fold = 0; fold < k; fold++) {
    const testStart = fold * foldSize;
    const testEnd = fold === k - 1 ? shuffled.length : testStart + foldSize;
    const testData = shuffled.slice(testStart, testEnd);
    const trainData = [...shuffled.slice(0, testStart), ...shuffled.slice(testEnd)];

    // Train: analyze train data to count category distributions (for info)
    const trainDist: Record<string, number> = {};
    for (const entry of trainData) {
      trainDist[entry.label.category] = (trainDist[entry.label.category] || 0) + 1;
    }

    // Test: run classifier on test fold
    const classifier = new MailClassifier();
    const results: Array<{ predicted: PersonaType; actual: PersonaType; entry: GoldenMailEntry; result: ClassificationResult }> = [];

    for (const entry of testData) {
      const mail: MailItem = {
        id: entry.id,
        subject: entry.subject,
        from: entry.from,
        to: entry.to,
        body: entry.body,
        receivedAt: entry.receivedAt,
      };
      const result = classifier.classify(mail);
      results.push({
        predicted: result.category,
        actual: entry.label.category,
        entry,
        result,
      });
    }

    const correct = results.filter(r => r.predicted === r.actual).length;
    const accuracy = correct / results.length;

    // Calculate F1
    const confusion: Record<string, Record<string, number>> = {};
    for (const cat of ALL_CATEGORIES) {
      confusion[cat] = {};
      for (const cat2 of ALL_CATEGORIES) confusion[cat][cat2] = 0;
    }
    for (const r of results) confusion[r.actual][r.predicted]++;

    let macroF = 0;
    for (const cat of ALL_CATEGORIES) {
      const tp = confusion[cat][cat];
      const fp = ALL_CATEGORIES.reduce((sum, c) => sum + (c !== cat ? confusion[c][cat] : 0), 0);
      const fn = ALL_CATEGORIES.reduce((sum, c) => sum + (c !== cat ? confusion[cat][c] : 0), 0);
      const p = tp + fp > 0 ? tp / (tp + fp) : 0;
      const r = tp + fn > 0 ? tp / (tp + fn) : 0;
      macroF += p + r > 0 ? (2 * p * r) / (p + r) : 0;
    }
    macroF /= ALL_CATEGORIES.length;

    foldAccuracies.push(accuracy);
    foldF1s.push(macroF);
    console.log(`  Fold ${fold + 1}: Accuracy=${(accuracy * 100).toFixed(1)}% (${correct}/${results.length}), F1=${macroF.toFixed(3)}`);
  }

  const meanAcc = foldAccuracies.reduce((a, b) => a + b, 0) / k;
  const meanF1 = foldF1s.reduce((a, b) => a + b, 0) / k;
  const stdAcc = Math.sqrt(foldAccuracies.reduce((sum, a) => sum + (a - meanAcc) ** 2, 0) / k);

  console.log(`\n=== CV Summary ===`);
  console.log(`Mean Accuracy: ${(meanAcc * 100).toFixed(1)}% (±${(stdAcc * 100).toFixed(1)}%)`);
  console.log(`Mean F1: ${meanF1.toFixed(3)}`);
  console.log(`Per-fold: ${foldAccuracies.map(a => (a * 100).toFixed(1) + '%').join(', ')}`);
}

// ── CLI ────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  let goldenPath = path.join(__dirname, 'golden-data', 'classification-golden-v1.json');
  let outputPath = path.join(__dirname, 'baseline-report.json');
  let splitOnly = 'all'; // 'eval', 'prompt-dev', 'all'
  let cvMode = false;
  let cvFolds = 5;


  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--golden') goldenPath = args[++i];
    if (args[i] === '--output') outputPath = args[++i];
    if (args[i] === '--split') splitOnly = args[++i];
    if (args[i] === '--cv') { cvMode = true; cvFolds = parseInt(args[++i]) || 5; }

  }

  const golden: GoldenMailEntry[] = JSON.parse(fs.readFileSync(goldenPath, 'utf-8'));
  const manifestPath = path.join(path.dirname(goldenPath), 'manifest.json');
  let evalIds: Set<string> | null = null;

  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    if (splitOnly === 'eval') {
      evalIds = new Set(manifest.splits.eval.ids);
    } else if (splitOnly === 'prompt-dev') {
      evalIds = new Set(manifest.splits.promptDev.ids);
    }
  }

  if (cvMode) {
    runCrossValidation(golden, cvFolds);
    return;
  }

  const dataset = evalIds ? golden.filter(e => evalIds.has(e.id)) : golden;

  const classifier = new MailClassifier();
  const results: Array<{ predicted: PersonaType; actual: PersonaType; entry: GoldenMailEntry; result: ClassificationResult }> = [];

  for (const entry of dataset) {
    const mail: MailItem = {
      id: entry.id,
      subject: entry.subject,
      from: entry.from,
      to: entry.to,
      body: entry.body,
      receivedAt: entry.receivedAt,
    };
    const result = classifier.classify(mail);
    results.push({
      predicted: result.category,
      actual: entry.label.category,
      entry,
      result,
    });
  }

  const report = calculateMetrics(results);
  report.meta.evalSamples = splitOnly === 'eval' ? dataset.length : 0;
  report.meta.promptDevSamples = splitOnly === 'prompt-dev' ? dataset.length : 0;

  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

  // Console output
  console.log('=== Baseline Report ===');
  console.log(`Total samples: ${report.meta.totalSamples}`);
  console.log(`Split: ${splitOnly}`);
  console.log(`Accuracy: ${(report.overall.accuracy * 100).toFixed(1)}%`);
  console.log(`Macro-F1: ${report.overall.macroF1.toFixed(3)}`);
  console.log(`Macro-Precision: ${report.overall.macroPrecision.toFixed(3)}`);
  console.log(`Macro-Recall: ${report.overall.macroRecall.toFixed(3)}`);
  console.log();
  console.log('Per-category:');
  for (const [cat, m] of Object.entries(report.perCategory)) {
    console.log(`  ${cat}: P=${m.precision.toFixed(3)} R=${m.recall.toFixed(3)} F1=${m.f1.toFixed(3)} (n=${m.support})`);
  }
  console.log();
  console.log('Top confusion pairs:');
  for (const entry of report.confusionMatrix.slice(0, 10)) {
    console.log(`  ${entry.actual} → ${entry.predicted}: ${entry.count}`);
  }
  console.log();
  console.log('By difficulty:');
  for (const [d, m] of Object.entries(report.errorBreakdown.byDifficulty)) {
    console.log(`  ${d}: ${(m.accuracy * 100).toFixed(1)}% (${m.total - m.errors}/${m.total})`);
  }
  console.log();
  console.log('By ambiguity:');
  console.log(`  ambiguous: ${(report.errorBreakdown.byAmbiguity.ambiguous.accuracy * 100).toFixed(1)}% (${report.errorBreakdown.byAmbiguity.ambiguous.total - report.errorBreakdown.byAmbiguity.ambiguous.errors}/${report.errorBreakdown.byAmbiguity.ambiguous.total})`);
  console.log(`  clear: ${(report.errorBreakdown.byAmbiguity.clear.accuracy * 100).toFixed(1)}% (${report.errorBreakdown.byAmbiguity.clear.total - report.errorBreakdown.byAmbiguity.clear.errors}/${report.errorBreakdown.byAmbiguity.clear.total})`);
  console.log();
  console.log(`Report written to: ${outputPath}`);
}

main();
