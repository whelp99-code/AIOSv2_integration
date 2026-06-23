/**
 * BriefingEngine - CEO 아침 브리핑 엔진 (강화版)
 * 
 * 요약 + CEO 승인/결정 필요 액션 아이템을 포함한 브리핑을 생성한다.
 * 페르소나별 처리 결과 집계, 우선순위 정렬 포함.
 */

// 브리핑 아이템
export interface BriefingItem {
  mailId: string;
  subject: string;
  category: string;
  confidence: number;
  actionRequired: boolean;
  summary: string;
  priority?: 'high' | 'medium' | 'low';
  source?: string; // 페르소나 출처
}

// CEO 브리핑 아이템
export interface CEOBriefingItem {
  id: string;
  type: 'ACTION_REQUIRED' | 'APPROVAL_PENDING' | 'INFO' | 'ALERT';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  personaType: string;
  mailId: string;
  amount?: number;
  deadline?: string;
  createdAt: string;
}

// 페르소나별 처리 통계
export interface PersonaStats {
  personaType: string;
  totalProcessed: number;
  successCount: number;
  failureCount: number;
  avgConfidence: number;
}

// 브리핑 포맷
export interface DailyBriefing {
  date: string;
  summary: BriefingSummary;
  actionItems: CEOBriefingItem[];
  approvalPending: CEOBriefingItem[];
  personaStats: PersonaStats[];
  topCategories: Array<{ category: string; count: number }>;
}

export interface BriefingSummary {
  totalProcessed: number;
  autoHandled: number;
  requiresApproval: number;
  requiresReview: number;
  ceoActionItems: number;
  alerts: number;
}

/**
 * CEO 브리핑 엔진 (강화版)
 */
export class BriefingEngine {
  /**
   * 일일 브리핑 생성
   */
  generateDailyBriefing(items: BriefingItem[]): DailyBriefing {
    const today = new Date().toISOString().split('T')[0];

    // 통계 계산
    const summary = this.calculateSummary(items);
    const personaStats = this.calculatePersonaStats(items);
    const topCategories = this.calculateTopCategories(items);

    // CEO 액션 아이템 추출
    const actionItems = this.extractCEOActionItems(items);

    // 승인 대기 항목 추출
    const approvalPending = this.extractApprovalPending(items);

    return {
      date: today,
      summary,
      actionItems,
      approvalPending,
      personaStats,
      topCategories,
    };
  }

  /**
   * 요약 통계 계산
   */
  private calculateSummary(items: BriefingItem[]): BriefingSummary {
    return {
      totalProcessed: items.length,
      autoHandled: items.filter(i => !i.actionRequired).length,
      requiresApproval: items.filter(i => i.actionRequired && i.category === 'CEO').length,
      requiresReview: items.filter(i => i.actionRequired && (i.confidence || 0) < 0.7).length,
      ceoActionItems: items.filter(i => i.actionRequired).length,
      alerts: items.filter(i => (i.confidence || 0) < 0.5).length,
    };
  }

  /**
   * 페르소나별 통계 계산
   */
  private calculatePersonaStats(items: BriefingItem[]): PersonaStats[] {
    const statsMap = new Map<string, PersonaStats>();

    for (const item of items) {
      const persona = item.category;
      if (!statsMap.has(persona)) {
        statsMap.set(persona, {
          personaType: persona,
          totalProcessed: 0,
          successCount: 0,
          failureCount: 0,
          avgConfidence: 0,
        });
      }

      const stats = statsMap.get(persona)!;
      stats.totalProcessed++;
      if ((item.confidence || 0) >= 0.7) {
        stats.successCount++;
      } else {
        stats.failureCount++;
      }
    }

    // 평균 신뢰도 계산
    for (const stats of statsMap.values()) {
      const personaItems = items.filter(i => i.category === stats.personaType);
      const totalConfidence = personaItems.reduce((sum, i) => sum + (i.confidence || 0), 0);
      stats.avgConfidence = personaItems.length > 0 ? totalConfidence / personaItems.length : 0;
    }

    return Array.from(statsMap.values()).sort((a, b) => b.totalProcessed - a.totalProcessed);
  }

  /**
   * 상위 카테고리 계산
   */
  private calculateTopCategories(items: BriefingItem[]): Array<{ category: string; count: number }> {
    const categoryMap = new Map<string, number>();

    for (const item of items) {
      categoryMap.set(item.category, (categoryMap.get(item.category) || 0) + 1);
    }

    return Array.from(categoryMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  /**
   * CEO 액션 아이템 추출
   */
  private extractCEOActionItems(items: BriefingItem[]): CEOBriefingItem[] {
    return items
      .filter(item => item.actionRequired)
      .map(item => ({
        id: `ceo-action-${Date.now()}`,
        type: this.determineItemType(item),
        title: item.subject,
        description: item.summary,
        priority: this.determinePriority(item),
        personaType: item.category,
        mailId: item.mailId,
        createdAt: new Date().toISOString(),
      }))
      .sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
  }

  /**
   * 승인 대기 항목 추출
   */
  private extractApprovalPending(items: BriefingItem[]): CEOBriefingItem[] {
    return items
      .filter(item => item.category === 'CEO' && item.actionRequired)
      .map(item => ({
        id: `approval-pending-${Date.now()}`,
        type: 'APPROVAL_PENDING' as const,
        title: `[승인 필요] ${item.subject}`,
        description: item.summary,
        priority: 'high' as const,
        personaType: 'CEO',
        mailId: item.mailId,
        createdAt: new Date().toISOString(),
      }));
  }

  /**
   * 아이템 유형 결정
   */
  private determineItemType(item: BriefingItem): CEOBriefingItem['type'] {
    if (item.category === 'CEO') return 'APPROVAL_PENDING';
    if ((item.confidence || 0) < 0.5) return 'ALERT';
    if (item.actionRequired) return 'ACTION_REQUIRED';
    return 'INFO';
  }

  /**
   * 우선순위 결정
   */
  private determinePriority(item: BriefingItem): 'high' | 'medium' | 'low' {
    if (item.category === 'CEO') return 'high';
    if ((item.confidence || 0) < 0.6) return 'high';
    if ((item.confidence || 0) < 0.8) return 'medium';
    return 'low';
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
    md += `- 검토 필요: ${briefing.summary.requiresReview}건\n`;
    md += `- 알림: ${briefing.summary.alerts}건\n\n`;

    // CEO 액션 아이템
    if (briefing.actionItems.length > 0) {
      md += `## ⚠️ CEO 액션 필요\n`;
      for (const item of briefing.actionItems) {
        const priorityEmoji = item.priority === 'high' ? '🔴' : item.priority === 'medium' ? '🟡' : '🟢';
        md += `- ${priorityEmoji} **${item.title}** [${item.personaType}] - ${item.description}\n`;
      }
      md += '\n';
    }

    // 승인 대기
    if (briefing.approvalPending.length > 0) {
      md += `## ✅ 승인 대기\n`;
      for (const item of briefing.approvalPending) {
        md += `- **${item.title}** - ${item.description}\n`;
      }
      md += '\n';
    }

    // 페르소나별 통계
    md += `## 📈 페르소나별 통계\n`;
    md += `| 페르소나 | 처리 | 성공 | 실패 | 평균 신뢰도 |\n`;
    md += `|----------|------|------|------|-------------|\n`;
    for (const stats of briefing.personaStats) {
      md += `| ${stats.personaType} | ${stats.totalProcessed} | ${stats.successCount} | ${stats.failureCount} | ${Math.round(stats.avgConfidence * 100)}% |\n`;
    }
    md += '\n';

    // 상위 카테고리
    md += `## 🏷️ 상위 카테고리\n`;
    for (const cat of briefing.topCategories) {
      md += `- ${cat.category}: ${cat.count}건\n`;
    }

    return md;
  }
}
