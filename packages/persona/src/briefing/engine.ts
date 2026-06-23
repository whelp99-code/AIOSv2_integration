/**
 * BriefingEngine - CEO 아침 브리핑 엔진
 * 
 * 요약 + CEO 승인/결정 필요 액션 아이템을 포함한 브리핑을 생성한다.
 */

import { type BriefingItem } from '../personas/work-support';

// 브리핑 포맷
export interface DailyBriefing {
  date: string;
  summary: BriefingSummary;
  actionItems: ActionItem[];
  stats: BriefingStats;
}

export interface BriefingSummary {
  totalProcessed: number;
  autoHandled: number;
  requiresApproval: number;
  requiresReview: number;
}

export interface ActionItem {
  mailId: string;
  subject: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  action: string;
  deadline?: string;
}

export interface BriefingStats {
  byCategory: Record<string, number>;
  avgConfidence: number;
  topCategory: string;
}

/**
 * CEO 브리핑 엔진
 */
export class BriefingEngine {
  /**
   * 일일 브리핑 생성
   */
  generateDailyBriefing(items: BriefingItem[]): DailyBriefing {
    const today = new Date().toISOString().split('T')[0];

    // 통계 계산
    const stats = this.calculateStats(items);
    
    // 액션 아이템 추출
    const actionItems = this.extractActionItems(items);

    // 요약 생성
    const summary: BriefingSummary = {
      totalProcessed: items.length,
      autoHandled: items.filter(i => !i.actionRequired).length,
      requiresApproval: items.filter(i => i.actionRequired && i.category === 'CEO').length,
      requiresReview: items.filter(i => i.actionRequired && i.confidence < 0.7).length,
    };

    return {
      date: today,
      summary,
      actionItems,
      stats,
    };
  }

  /**
   * 통계 계산
   */
  private calculateStats(items: BriefingItem[]): BriefingStats {
    const byCategory: Record<string, number> = {};
    let totalConfidence = 0;

    for (const item of items) {
      byCategory[item.category] = (byCategory[item.category] || 0) + 1;
      totalConfidence += item.confidence;
    }

    // 가장 많은 카테고리
    const topCategory = Object.entries(byCategory)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'WORK_SUPPORT';

    return {
      byCategory,
      avgConfidence: items.length > 0 ? totalConfidence / items.length : 0,
      topCategory,
    };
  }

  /**
   * 액션 아이템 추출
   */
  private extractActionItems(items: BriefingItem[]): ActionItem[] {
    return items
      .filter(item => item.actionRequired)
      .map(item => ({
        mailId: item.mailId,
        subject: item.subject,
        category: item.category,
        priority: this.determinePriority(item),
        action: this.determineAction(item),
      }))
      .sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
  }

  /**
   * 우선순위 결정
   */
  private determinePriority(item: BriefingItem): 'high' | 'medium' | 'low' {
    if (item.category === 'CEO') return 'high';
    if (item.confidence < 0.6) return 'high';
    if (item.confidence < 0.8) return 'medium';
    return 'low';
  }

  /**
   * 액션 결정
   */
  private determineAction(item: BriefingItem): string {
    if (item.category === 'CEO') {
      return '승인 필요';
    }
    if (item.confidence < 0.7) {
      return '분류 검토 필요';
    }
    return '자동 처리 대기';
  }

  /**
   * 브리핑을 JSON으로 포맷
   */
  formatAsJson(briefing: DailyBriefing): string {
    return JSON.stringify(briefing, null, 2);
  }

  /**
   * 브리핑을 마크다운으로 포맷
   */
  formatAsMarkdown(briefing: DailyBriefing): string {
    let md = `# CEO 일일 브리핑 - ${briefing.date}\n\n`;

    // 요약
    md += `## 📊 요약\n`;
    md += `- 처리된 메일: ${briefing.summary.totalProcessed}건\n`;
    md += `- 자동 처리: ${briefing.summary.autoHandled}건\n`;
    md += `- CEO 승인 필요: ${briefing.summary.requiresApproval}건\n`;
    md += `- 검토 필요: ${briefing.summary.requiresReview}건\n\n`;

    // 액션 아이템
    if (briefing.actionItems.length > 0) {
      md += `## ⚠️ CEO 액션 필요\n`;
      for (const item of briefing.actionItems) {
        const priorityEmoji = item.priority === 'high' ? '🔴' : item.priority === 'medium' ? '🟡' : '🟢';
        md += `- ${priorityEmoji} **${item.subject}** [${item.category}] - ${item.action}\n`;
      }
      md += '\n';
    }

    // 통계
    md += `## 📈 통계\n`;
    md += `- 평균 신뢰도: ${Math.round(briefing.stats.avgConfidence * 100)}%\n`;
    md += `- 가장 많은 카테고리: ${briefing.stats.topCategory}\n`;
    md += `- 카테고리별 분포:\n`;
    for (const [category, count] of Object.entries(briefing.stats.byCategory)) {
      md += `  - ${category}: ${count}건\n`;
    }

    return md;
  }
}
