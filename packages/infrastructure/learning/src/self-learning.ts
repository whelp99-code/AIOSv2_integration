/**
 * Self-Learning System
 * 자기학습 시스템 (vibe-coding-os 재활용)
 */

export interface LearningExample {
  id: string;
  input: string;
  expectedOutput: string;
  actualOutput?: string;
  feedback?: string;
  score?: number;
  timestamp: Date;
}

export interface LearningStats {
  totalExamples: number;
  averageScore: number;
  improvementRate: number;
  lastTrainingDate?: Date;
}

export class SelfLearningSystem {
  private examples: LearningExample[] = [];

  addExample(example: Omit<LearningExample, 'id' | 'timestamp'>): LearningExample {
    const newExample: LearningExample = {
      ...example,
      id: `learn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date(),
    };
    this.examples.push(newExample);
    return newExample;
  }

  getExamples(limit = 100): LearningExample[] {
    return this.examples.slice(-limit);
  }

  getStats(): LearningStats {
    const scored = this.examples.filter((e) => e.score !== undefined);
    const avg = scored.length > 0
      ? scored.reduce((sum, e) => sum + (e.score || 0), 0) / scored.length
      : 0;
    return {
      totalExamples: this.examples.length,
      averageScore: avg,
      improvementRate: this.calculateImprovementRate(),
    };
  }

  private calculateImprovementRate(): number {
    if (this.examples.length < 10) return 0;
    const recent = this.examples.slice(-10);
    const older = this.examples.slice(-20, -10);
    const recentAvg = recent.filter((e) => e.score).reduce((s, e) => s + (e.score || 0), 0) / (recent.filter((e) => e.score).length || 1);
    const olderAvg = older.filter((e) => e.score).reduce((s, e) => s + (e.score || 0), 0) / (older.filter((e) => e.score).length || 1);
    return olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg) * 100 : 0;
  }
}
