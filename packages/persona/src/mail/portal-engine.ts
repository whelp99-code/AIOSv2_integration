/**
 * Portal Engine — Phase 8
 *
 * Orchestrates Wave E capabilities:
 * - Registry-based portal composition (modules → blocks → layout)
 * - Config profile management with snapshot rollback
 * - Connector registry with health status
 * - Portal task / review thread as operational backlog
 *
 * Source: docs/54-llm-classifier-model-integration-replan.md Phase 8
 */

import type { WaveEStore, ConnectorRegistryRecord } from './wave-e-store';

// ── Types ─────────────────────────────────────────────────────────────

export interface PortalPageConfig {
  pageKey: string;
  title: string;
  slots: Array<{ slotKey: string; blockKey: string; sortOrder: number }>;
}

export interface ConfigChange {
  profileKey: string;
  key: string;
  value: unknown;
  reason: string;
}

// ── Portal Engine ─────────────────────────────────────────────────────

export class PortalEngine {
  private store: WaveEStore;

  constructor(store: WaveEStore) {
    this.store = store;
  }

  // ── Registry-based Portal Composition ──────────────────────────

  /**
   * Register a module with its blocks and nodes.
   */
  registerModule(params: {
    moduleKey: string;
    displayName: string;
    version?: string;
    dependencies?: string[];
    blocks?: Array<{ blockKey: string; displayName: string; config?: Record<string, unknown> }>;
    nodes?: Array<{ nodeKey: string; nodeType: string; config?: Record<string, unknown> }>;
  }): { module: ReturnType<WaveEStore['registerModule']>; blocks: ReturnType<WaveEStore['registerBlock']>[]; nodes: ReturnType<WaveEStore['registerNode']>[] } {
    const module = this.store.registerModule(params.moduleKey, params.displayName, params.version, params.dependencies);
    const blocks = (params.blocks ?? []).map(b => this.store.registerBlock(b.blockKey, params.moduleKey, b.displayName, b.config));
    const nodes = (params.nodes ?? []).map(n => this.store.registerNode(n.nodeKey, params.moduleKey, n.nodeType, n.config));
    return { module, blocks, nodes };
  }

  /**
   * Compose a portal page by mapping blocks to layout slots.
   */
  composePage(config: PortalPageConfig): ReturnType<WaveEStore['getLayoutSlots']> {
    this.store.removeLayoutSlotsNotIn(config.pageKey, config.slots.map(s => s.slotKey));
    for (const slot of config.slots) {
      const block = this.store.getBlockByKey(slot.blockKey);
      this.store.setLayoutSlot(config.pageKey, slot.slotKey, slot.sortOrder, block?.id);
    }
    return this.store.getLayoutSlots(config.pageKey);
  }

  /**
   * Get the read path for a portal page — returns resolved blocks in order.
   */
  readPage(pageKey: string): Array<{ slotKey: string; blockKey: string; displayName: string; config: Record<string, unknown> | null }> {
    const slots = this.store.getLayoutSlots(pageKey);
    return slots.map(slot => {
      const block = slot.blockRegistryId ? this.store.blocks.find(b => b.id === slot.blockRegistryId) : null;
      return {
        slotKey: slot.slotKey,
        blockKey: block?.blockKey ?? 'empty',
        displayName: block?.displayName ?? 'Empty Slot',
        config: block?.configJson ?? null,
      };
    });
  }

  // ── Config Profile Management ──────────────────────────────────

  /**
   * Apply a config change. Supports snapshot before change for rollback.
   */
  applyConfigChange(change: ConfigChange): { success: boolean; previousValue: unknown } {
    const profileExists = this.store.configProfiles.some(p => p.key === change.profileKey);
    if (!profileExists) {
      return { success: false, previousValue: null };
    }
    const previousValue = this.store.getConfigValue(change.profileKey, change.key);
    this.store.setConfigValue(change.profileKey, change.key, change.value);
    return { success: true, previousValue };
  }

  /**
   * Take a snapshot of a config profile before making changes.
   */
  snapshotConfig(profileKey: string): void {
    this.store.snapshotConfig(profileKey);
  }

  /**
   * Rollback a config profile to its last snapshot.
   */
  rollbackConfig(profileKey: string): boolean {
    return this.store.rollbackConfig(profileKey);
  }

  /**
   * Get all config values for a profile.
   */
  getConfig(profileKey: string): Record<string, unknown> {
    return this.store.getConfigSnapshot(profileKey);
  }

  // ── Connector Health ───────────────────────────────────────────

  /**
   * Register a connector and link it to the registry.
   */
  registerConnector(key: string, displayName: string, connectorType: string) {
    return this.store.registerConnector(key, displayName, connectorType);
  }

  /**
   * Update connector health status.
   */
  updateConnectorHealth(key: string, status: ConnectorRegistryRecord['healthStatus']) {
    return this.store.updateConnectorHealth(key, status);
  }

  /**
   * Get connector health summary.
   */
  getConnectorHealthSummary(): { healthy: number; degraded: number; down: number; unknown: number; total: number } {
    const connectors = this.store.connectors;
    return {
      healthy: connectors.filter(c => c.healthStatus === 'healthy').length,
      degraded: connectors.filter(c => c.healthStatus === 'degraded').length,
      down: connectors.filter(c => c.healthStatus === 'down').length,
      unknown: connectors.filter(c => c.healthStatus === 'unknown').length,
      total: connectors.length,
    };
  }

  // ── Portal Tasks & Review Threads ──────────────────────────────

  /**
   * Create a portal task for operational backlog.
   */
  createTask(projectId: string, title: string, description?: string, source?: string) {
    return this.store.createPortalTask(projectId, title, description, source);
  }

  /**
   * Get backlog tasks (open/in_progress/blocked).
   */
  getBacklog(projectId?: string) {
    return this.store.getBacklogTasks(projectId);
  }

  /**
   * Create a review thread.
   */
  createReview(subject: string, author: string, content: string) {
    return this.store.createReviewThread(subject, { author, content });
  }

  /**
   * Add message to review thread.
   */
  addReviewMessage(threadId: string, author: string, content: string) {
    return this.store.addReviewMessage(threadId, author, content);
  }

  /**
   * Get open review threads.
   */
  getOpenReviews() {
    return this.store.getOpenReviewThreads();
  }

  // ── Knowledge / Memory ─────────────────────────────────────────

  addMemory(title: string, content: string, tags?: string[]) {
    return this.store.addMemoryItem(title, content, tags);
  }

  searchMemory(query: string) {
    return this.store.searchMemory(query);
  }

  // ── Summary ────────────────────────────────────────────────────

  summary() {
    return this.store.summary();
  }
}
