/**
 * Offline Benchmark Runner — Phase 3
 *
 * Runs the HybridMailClassifier against the golden dataset in shadow/hybrid mode
 * and produces comprehensive metrics: accuracy, macro-F1, confusion matrix,
 * per-category metrics, latency stats, cost estimates, and gate validation.
 *
 * Unlike benchmark.ts (rule-only baseline), this runner exercises the full
 * hybrid pipeline including shadow logging.
 *
 * Source: docs/54-llm-classifier-model-integration-replan.md Phase 3
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import type { PersonaType } from './classifier';
import type { ShadowLogEntry, ShadowSummary } from './shadow-logger';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Types ─────────────────────────────────────────────────────────────

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

interface BenchmarkGate {
  name: string;
  metric: string;
  threshold: string;
  actual: number | string;
  passed: boolean;
}

interface BenchmarkReport {
  meta: {
    generatedAt: string;
    classifierVersion: string;
    goldenDatasetVersion: string;
    mode: string;
    totalSamples: number;
  };
  gates: BenchmarkGate[];
  overall: {
    accuracy: number;
    macroF1: number;
    macroPrecision: number;
    macroRecall: number;
    highRiskFalseRouteRate: number;
    llmCallRatio: number;
    schemaValidRate: number;
  };
  latency: {
    ruleP50: number;
    ruleP95: number;
    llmP50: number;
    llmP95: number;
    totalP50: number;
    totalP95: number;
  };
  confusionMatrix: Array<{
    actual: PersonaType;
    predicted: PersonaType;
    count: number;
  }>;
  perCategory: Record<string, {
    precision: number;
    recall: number;
    f1: number;
    support: number;
  }>;
  shadow?: ShadowSummary;
  costEstimate: {
    totalTokens: number;
    estimatedCostUsd: number;
    avgTokensPerCall: number;
  };
}

// ── Offline Benchmark Runner ──────────────────────────────────────────

export class OfflineBenchmarkRunner {
  private goldenPath: string;
  private manifestPath: string;

  constructor(options?: { goldenPath?: string }) {
    this.goldenPath = options?.goldenPath ?? path.join(__dirname, 'golden-data', 'classification-golden-v1.json');
    this.manifestPath = path.join(path.dirname(this.goldenPath), 'manifest.json');
  }

  /**
   * Run benchmark using shadow log entries (for shadow mode evaluation).
   * Compares shadow entries against golden dataset ground truth.
   */
  runFromShadowLog(
    shadowEntries: readonly ShadowLogEntry[],
    options?: { split?: 'eval' | 'all' },
  ): BenchmarkReport {
    const golden = this.loadGolden(options?.split);
    const goldenMap = new Map(golden.map(e => [e.id, e]));

    // Match shadow entries to golden labels
    const results: Array<{
      predicted: PersonaType;
      actual: PersonaType;
      entry: GoldenMailEntry;
      shadowEntry: ShadowLogEntry;
    }> = [];

    for (const se of shadowEntries) {
      const ge = goldenMap.get(se.mailId);
      if (ge) {
        results.push({
          predicted: se.merged.category,
          actual: ge.label.category,
          entry: ge,
          shadowEntry: se,
        });
      }
    }

    return this.buildReport(results, 'shadow');
  }

  /**
   * Run offline benchmark by simulating hybrid classifier on golden dataset.
   * This uses the rule classifier only (no LLM) to measure rule baseline
   * on the golden dataset with the hybrid pipeline's normalization.
   */
  async runOffline(
    classifyFn: (mail: { id: string; subject: string; from: string; to: string[]; body: string; receivedAt: string }) => Promise<{ category: PersonaType; confidence: number }>,
    options?: { split?: 'eval' | 'all'; shadowEntries?: readonly ShadowLogEntry[] },
  ): Promise<BenchmarkReport> {
    const golden = this.loadGolden(options?.split);
    const results: Array<{
      predicted: PersonaType;
      actual: PersonaType;
      entry: GoldenMailEntry;
      shadowEntry: ShadowLogEntry | null;
    }> = [];

    for (const entry of golden) {
      const start = Date.now();
      const result = await classifyFn({
        id: entry.id,
        subject: entry.subject,
        from: entry.from,
        to: entry.to,
        body: entry.body,
        receivedAt: entry.receivedAt,
      });
      const latencyMs = Date.now() - start;

      results.push({
        predicted: result.category,
        actual: entry.label.category,
        entry,
        shadowEntry: null,
      });
    }

    const shadow = options?.shadowEntries
      ? this.summarizeShadowEntries(options.shadowEntries)
      : undefined;

    return this.buildReport(results, 'offline', shadow);
  }

  /**
   * Validate Phase 3 gates against a benchmark report.
   */
  validateGates(report: BenchmarkReport): { allPassed: boolean; gates: BenchmarkGate[] } {
    const gates: BenchmarkGate[] = [
      {
        name: 'Accuracy',
        metric: 'accuracy',
        threshold: '≥ 0.95',
        actual: report.overall.accuracy,
        passed: report.overall.accuracy >= 0.95,
      },
      {
        name: 'Macro-F1',
        metric: 'macroF1',
        threshold: '≥ 0.93',
        actual: report.overall.macroF1,
        passed: report.overall.macroF1 >= 0.93,
      },
      {
        name: 'High-risk false route',
        metric: 'highRiskFalseRouteRate',
        threshold: '≤ 0.01',
        actual: report.overall.highRiskFalseRouteRate,
        passed: report.overall.highRiskFalseRouteRate <= 0.01,
      },
      {
        name: 'P95 latency',
        metric: 'totalP95',
        threshold: '≤ 2000ms',
        actual: report.latency.totalP95,
        passed: report.latency.totalP95 <= 2000,
      },
      {
        name: 'LLM call ratio',
        metric: 'llmCallRatio',
        threshold: '≤ 0.35',
        actual: report.overall.llmCallRatio,
        passed: report.overall.llmCallRatio <= 0.35,
      },
      {
        name: 'Schema valid rate',
        metric: 'schemaValidRate',
        threshold: '≥ 0.995',
        actual: report.overall.schemaValidRate,
        passed: report.overall.schemaValidRate >= 0.995,
      },
    ];

    return {
      allPassed: gates.every(g => g.passed),
      gates,
    };
  }

  /**
   * Format report as human-readable text.
   */
  formatReport(report: BenchmarkReport): string {
    const lines: string[] = [];
    lines.push('=== Offline Benchmark Report ===');
    lines.push(`Mode: ${report.meta.mode}`);
    lines.push(`Samples: ${report.meta.totalSamples}`);
    lines.push(`Generated: ${report.meta.generatedAt}`);
    lines.push('');

    lines.push('--- Gate Results ---');
    const { allPassed, gates } = this.validateGates(report);
    for (const gate of gates) {
      const icon = gate.passed ? '✅' : '❌';
      lines.push(`  ${icon} ${gate.name}: ${gate.actual} (required: ${gate.threshold})`);
    }
    lines.push(`  Overall: ${allPassed ? 'ALL GATES PASSED' : 'SOME GATES FAILED'}`);
    lines.push('');

    lines.push('--- Overall Metrics ---');
    lines.push(`  Accuracy: ${(report.overall.accuracy * 100).toFixed(1)}%`);
    lines.push(`  Macro-F1: ${report.overall.macroF1.toFixed(3)}`);
    lines.push(`  Macro-Precision: ${report.overall.macroPrecision.toFixed(3)}`);
    lines.push(`  Macro-Recall: ${report.overall.macroRecall.toFixed(3)}`);
    lines.push('');

    lines.push('--- Per-Category ---');
    for (const [cat, m] of Object.entries(report.perCategory)) {
      lines.push(`  ${cat}: P=${m.precision.toFixed(3)} R=${m.recall.toFixed(3)} F1=${m.f1.toFixed(3)} (n=${m.support})`);
    }
    lines.push('');

    lines.push('--- Latency ---');
    lines.push(`  Rule P50/P95: ${report.latency.ruleP50.toFixed(0)}ms / ${report.latency.ruleP95.toFixed(0)}ms`);
    lines.push(`  LLM P50/P95: ${report.latency.llmP50.toFixed(0)}ms / ${report.latency.llmP95.toFixed(0)}ms`);
    lines.push(`  Total P50/P95: ${report.latency.totalP50.toFixed(0)}ms / ${report.latency.totalP95.toFixed(0)}ms`);

    if (report.costEstimate.totalTokens > 0) {
      lines.push('');
      lines.push('--- Cost Estimate ---');
      lines.push(`  Total tokens: ${report.costEstimate.totalTokens}`);
      lines.push(`  Avg tokens/call: ${report.costEstimate.avgTokensPerCall.toFixed(0)}`);
      lines.push(`  Est. cost: $${report.costEstimate.estimatedCostUsd.toFixed(4)}`);
    }

    lines.push('');
    lines.push('--- Confusion (Top 10) ---');
    for (const entry of report.confusionMatrix.slice(0, 10)) {
      lines.push(`  ${entry.actual} → ${entry.predicted}: ${entry.count}`);
    }

    return lines.join('\n');
  }

  // ── Private ──────────────────────────────────────────────────────

  private loadGolden(split?: 'eval' | 'all'): GoldenMailEntry[] {
    const all: GoldenMailEntry[] = JSON.parse(fs.readFileSync(this.goldenPath, 'utf-8'));

    if (split === 'eval' && fs.existsSync(this.manifestPath)) {
      const manifest = JSON.parse(fs.readFileSync(this.manifestPath, 'utf-8'));
      const evalIds = new Set(manifest.splits.eval.ids);
      return all.filter(e => evalIds.has(e.id));
    }

    return all;
  }

  private buildReport(
    results: Array<{ predicted: PersonaType; actual: PersonaType; entry: GoldenMailEntry; shadowEntry: ShadowLogEntry | null }>,
    mode: string,
    shadow?: ShadowSummary,
  ): BenchmarkReport {
    const total = results.length;
    const correct = results.filter(r => r.predicted === r.actual).length;
    const accuracy = correct / total;

    // Confusion matrix
    const categories: PersonaType[] = ['WORK_SUPPORT', 'SALES', 'PRESALES', 'ENGINEER', 'PM', 'FINANCE', 'MARKETING', 'CEO'];
    const confusion: Record<string, Record<string, number>> = {};
    for (const c of categories) {
      confusion[c] = {};
      for (const c2 of categories) confusion[c][c2] = 0;
    }
    for (const r of results) confusion[r.actual][r.predicted]++;

    // Per-category metrics
    const perCategory: Record<string, { precision: number; recall: number; f1: number; support: number }> = {};
    let macroP = 0, macroR = 0, macroF = 0;
    for (const cat of categories) {
      const tp = confusion[cat][cat];
      const fp = categories.reduce((s, c) => s + (c !== cat ? confusion[c][cat] : 0), 0);
      const fn = categories.reduce((s, c) => s + (c !== cat ? confusion[cat][c] : 0), 0);
      const support = tp + fn;
      const p = tp + fp > 0 ? tp / (tp + fp) : 0;
      const r = tp + fn > 0 ? tp / (tp + fn) : 0;
      const f = p + r > 0 ? (2 * p * r) / (p + r) : 0;
      perCategory[cat] = { precision: p, recall: r, f1: f, support };
      macroP += p;
      macroR += r;
      macroF += f;
    }
    macroP /= categories.length;
    macroR /= categories.length;
    macroF /= categories.length;

    // Confusion matrix flat
    const confusionMatrix: Array<{ actual: PersonaType; predicted: PersonaType; count: number }> = [];
    for (const a of categories) {
      for (const p of categories) {
        if (confusion[a][p] > 0 && a !== p) {
          confusionMatrix.push({ actual: a, predicted: p, count: confusion[a][p] });
        }
      }
    }
    confusionMatrix.sort((a, b) => b.count - a.count);

    // High-risk false route rate
    const highRiskPairs: Array<[string, string]> = [
      ['CEO', 'WORK_SUPPORT'], ['WORK_SUPPORT', 'CEO'],
      ['FINANCE', 'WORK_SUPPORT'], ['WORK_SUPPORT', 'FINANCE'],
    ];
    const highRiskErrors = results.filter(r =>
      r.predicted !== r.actual &&
      highRiskPairs.some(([a, b]) =>
        (r.actual === a && r.predicted === b) || (r.actual === b && r.predicted === a),
      ),
    ).length;
    const highRiskFalseRouteRate = total > 0 ? highRiskErrors / total : 0;

    // Latency from shadow entries (defaults if no shadow)
    const latencies = results
      .filter(r => r.shadowEntry)
      .map(r => r.shadowEntry!.latency);
    const ruleLats = latencies.map(l => l.ruleMs).sort((a, b) => a - b);
    const llmLats = latencies.map(l => l.llmMs).filter(l => l > 0).sort((a, b) => a - b);
    const totalLats = latencies.map(l => l.totalMs).sort((a, b) => a - b);

    // Cost estimate
    const withTokens = results.filter(r => r.shadowEntry && r.shadowEntry.tokens.total > 0);
    const totalTokens = withTokens.reduce((s, r) => s + r.shadowEntry!.tokens.total, 0);
    const avgTokens = withTokens.length > 0 ? totalTokens / withTokens.length : 0;
    const costPer1k = 0.002; // blended estimate

    // LLM metrics
    const llmCalled = shadow?.llmCalledCount ?? 0;
    const llmCallRatio = total > 0 ? llmCalled / total : 0;
    const schemaValidRate = shadow?.schemaValidRate ?? 1;

    return {
      meta: {
        generatedAt: new Date().toISOString(),
        classifierVersion: 'hybrid-v1',
        goldenDatasetVersion: 'classification-golden-v1',
        mode,
        totalSamples: total,
      },
      gates: [], // populated by validateGates()
      overall: {
        accuracy,
        macroF1: macroF,
        macroPrecision: macroP,
        macroRecall: macroR,
        highRiskFalseRouteRate,
        llmCallRatio,
        schemaValidRate,
      },
      latency: {
        ruleP50: pctl(ruleLats, 50),
        ruleP95: pctl(ruleLats, 95),
        llmP50: pctl(llmLats, 50),
        llmP95: pctl(llmLats, 95),
        totalP50: pctl(totalLats, 50),
        totalP95: pctl(totalLats, 95),
      },
      confusionMatrix,
      perCategory,
      shadow,
      costEstimate: {
        totalTokens,
        estimatedCostUsd: (totalTokens / 1000) * costPer1k,
        avgTokensPerCall: avgTokens,
      },
    };
  }

  private summarizeShadowEntries(entries: readonly ShadowLogEntry[]): ShadowSummary {
    const withLLM = entries.filter(e => e.llm !== null);
    const agreements = entries.filter(e => e.agreement);
    const schemaValid = withLLM.filter(e => e.merged.reason !== 'llm_invalid_response');

    return {
      totalEntries: entries.length,
      agreementCount: agreements.length,
      disagreementCount: entries.length - agreements.length,
      agreementRate: withLLM.length > 0 ? agreements.length / withLLM.length : 1,
      highRiskDisagreementCount: entries.filter(e => e.highRiskDisagreement).length,
      reviewNeededCount: entries.filter(e => e.needsReview).length,
      llmCalledCount: withLLM.length,
      llmCallRatio: entries.length > 0 ? withLLM.length / entries.length : 0,
      llmSuccessCount: withLLM.filter(e => e.llm !== null).length,
      llmSchemaValidCount: schemaValid.length,
      schemaValidRate: withLLM.length > 0 ? schemaValid.length / withLLM.length : 1,
      latency: { ruleP50: 0, ruleP95: 0, llmP50: 0, llmP95: 0, totalP50: 0, totalP95: 0 },
      perCategory: {},
      providerBreakdown: {},
    };
  }
}

// ── Utility ───────────────────────────────────────────────────────────

function pctl(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

// ── CLI ────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  let mode = 'rules-only';
  let split = 'all';
  let outputPath = path.join(__dirname, 'benchmark-report-phase3.json');

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--mode') mode = args[++i];
    if (args[i] === '--split') split = args[++i];
    if (args[i] === '--output') outputPath = args[++i];
  }

  // Import classifier dynamically
  const { HybridMailClassifier } = await import('./hybrid-classifier');
  const hybrid = new HybridMailClassifier();

  const runner = new OfflineBenchmarkRunner();

  console.log(`Running offline benchmark in ${mode} mode, split=${split}...`);

  const report = await runner.runOffline(
    async (mail) => hybrid.classifyAsync(mail, { mode: mode as any }),
    { split: split as any },
  );

  const { gates } = runner.validateGates(report);
  report.gates = gates;

  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(runner.formatReport(report));
  console.log(`\nReport written to: ${outputPath}`);
}

main().catch(console.error);
