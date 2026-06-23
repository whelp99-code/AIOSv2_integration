/**
 * Wave E Store — Phase 8: Portal Registry & Config UX
 *
 * In-memory store for 12 Wave E models:
 * ModuleRegistry, BlockRegistry, LayoutSlot, NodeRegistry,
 * QueryRegistry, ConnectorRegistry, Canvas, MemoryItem,
 * ReviewThread, AutomationPortalTask, ConfigProfile, ConfigValue
 *
 * Source: docs/54-llm-classifier-model-integration-replan.md Phase 8
 */

// ═══════════════════════════════════════════════════════════════════════
// Model Types
// ═══════════════════════════════════════════════════════════════════════

export interface ModuleRegistryRecord {
  id: string; moduleKey: string; displayName: string; version: string;
  dependencies: string[]; status: 'active' | 'disabled' | 'deprecated'; createdAt: string;
}
export interface BlockRegistryRecord {
  id: string; blockKey: string; moduleKey: string; displayName: string;
  configJson: Record<string, unknown> | null; createdAt: string;
}
export interface LayoutSlotRecord {
  id: string; pageKey: string; slotKey: string; sortOrder: number; blockRegistryId: string | null; createdAt: string;
}
export interface NodeRegistryRecord {
  id: string; nodeKey: string; moduleKey: string; nodeType: string;
  configJson: Record<string, unknown> | null; createdAt: string;
}
export interface QueryRegistryRecord {
  id: string; queryKey: string; sourceType: string; configJson: Record<string, unknown>; createdAt: string;
}
export interface ConnectorRegistryRecord {
  id: string; connectorKey: string; displayName: string; connectorType: string;
  status: 'active' | 'disabled' | 'error'; healthStatus: 'healthy' | 'degraded' | 'down' | 'unknown';
  lastCheckedAt: string | null; createdAt: string;
}
export interface CanvasRecord {
  id: string; name: string; widgets: Array<{ slotKey: string; blockKey: string }>; createdAt: string;
}
export interface MemoryItemRecord {
  id: string; title: string; content: string; tags: string[]; createdAt: string;
}
export type ReviewStatus = 'open' | 'in_progress' | 'resolved' | 'wontfix';
export interface ReviewThreadRecord {
  id: string; subject: string; status: ReviewStatus; messages: Array<{ author: string; content: string; timestamp: string }>; createdAt: string;
}
export type PortalTaskStatus = 'open' | 'in_progress' | 'blocked' | 'completed';
export interface AutomationPortalTaskRecord {
  id: string; projectId: string; title: string; description: string | null;
  status: PortalTaskStatus; source: string; assignee: string | null; createdAt: string;
}
export interface ConfigProfileRecord {
  id: string; key: string; description: string | null; createdAt: string;
}
export interface ConfigValueRecord {
  id: string; profileId: string; key: string; valueJson: unknown; createdAt: string;
}

// ═══════════════════════════════════════════════════════════════════════
// Wave E Store
// ═══════════════════════════════════════════════════════════════════════

let nextId = 1;
function genId(prefix: string = 'we'): string { return `${prefix}-${String(nextId++).padStart(8, '0')}`; }

export class WaveEStore {
  readonly modules: ModuleRegistryRecord[] = [];
  readonly blocks: BlockRegistryRecord[] = [];
  readonly layoutSlots: LayoutSlotRecord[] = [];
  readonly nodes: NodeRegistryRecord[] = [];
  readonly queries: QueryRegistryRecord[] = [];
  readonly connectors: ConnectorRegistryRecord[] = [];
  readonly canvases: CanvasRecord[] = [];
  readonly memoryItems: MemoryItemRecord[] = [];
  readonly reviewThreads: ReviewThreadRecord[] = [];
  readonly portalTasks: AutomationPortalTaskRecord[] = [];
  readonly configProfiles: ConfigProfileRecord[] = [];
  readonly configValues: ConfigValueRecord[] = [];

  // ── Module Registry ────────────────────────────────────────────

  registerModule(moduleKey: string, displayName: string, version: string = '0.1.0', dependencies: string[] = []): ModuleRegistryRecord {
    const existing = this.modules.find(m => m.moduleKey === moduleKey);
    if (existing) { existing.version = version; existing.dependencies = dependencies; return existing; }
    const r: ModuleRegistryRecord = { id: genId('mod'), moduleKey, displayName, version, dependencies, status: 'active', createdAt: new Date().toISOString() };
    this.modules.push(r); return r;
  }
  getModule(moduleKey: string): ModuleRegistryRecord | null { return this.modules.find(m => m.moduleKey === moduleKey) ?? null; }

  // ── Block Registry ─────────────────────────────────────────────

  registerBlock(blockKey: string, moduleKey: string, displayName: string, config?: Record<string, unknown>): BlockRegistryRecord {
    const r: BlockRegistryRecord = { id: genId('blk'), blockKey, moduleKey, displayName, configJson: config ?? null, createdAt: new Date().toISOString() };
    this.blocks.push(r); return r;
  }
  getBlocksByModule(moduleKey: string): BlockRegistryRecord[] { return this.blocks.filter(b => b.moduleKey === moduleKey); }

  // ── Layout Slots ───────────────────────────────────────────────

  setLayoutSlot(pageKey: string, slotKey: string, sortOrder: number, blockRegistryId?: string): LayoutSlotRecord {
    const existing = this.layoutSlots.find(s => s.pageKey === pageKey && s.slotKey === slotKey);
    if (existing) { existing.sortOrder = sortOrder; existing.blockRegistryId = blockRegistryId ?? null; return existing; }
    const r: LayoutSlotRecord = { id: genId('slot'), pageKey, slotKey, sortOrder, blockRegistryId: blockRegistryId ?? null, createdAt: new Date().toISOString() };
    this.layoutSlots.push(r); return r;
  }
  getLayoutSlots(pageKey: string): LayoutSlotRecord[] {
    return this.layoutSlots.filter(s => s.pageKey === pageKey).sort((a, b) => a.sortOrder - b.sortOrder);
  }

  // ── Node Registry ──────────────────────────────────────────────

  registerNode(nodeKey: string, moduleKey: string, nodeType: string, config?: Record<string, unknown>): NodeRegistryRecord {
    const r: NodeRegistryRecord = { id: genId('node'), nodeKey, moduleKey, nodeType, configJson: config ?? null, createdAt: new Date().toISOString() };
    this.nodes.push(r); return r;
  }

  // ── Query Registry ─────────────────────────────────────────────

  registerQuery(queryKey: string, sourceType: string, config: Record<string, unknown>): QueryRegistryRecord {
    const r: QueryRegistryRecord = { id: genId('qry'), queryKey, sourceType, configJson: config, createdAt: new Date().toISOString() };
    this.queries.push(r); return r;
  }

  // ── Connector Registry ─────────────────────────────────────────

  registerConnector(connectorKey: string, displayName: string, connectorType: string): ConnectorRegistryRecord {
    const r: ConnectorRegistryRecord = { id: genId('conn'), connectorKey, displayName, connectorType, status: 'active', healthStatus: 'unknown', lastCheckedAt: null, createdAt: new Date().toISOString() };
    this.connectors.push(r); return r;
  }
  updateConnectorHealth(connectorKey: string, healthStatus: ConnectorRegistryRecord['healthStatus']): ConnectorRegistryRecord | null {
    const c = this.connectors.find(x => x.connectorKey === connectorKey); if (!c) return null;
    c.healthStatus = healthStatus; c.lastCheckedAt = new Date().toISOString(); return c;
  }
  getConnectorsByHealth(health: ConnectorRegistryRecord['healthStatus']): ConnectorRegistryRecord[] {
    return this.connectors.filter(c => c.healthStatus === health);
  }

  // ── Canvas ─────────────────────────────────────────────────────

  createCanvas(name: string, widgets?: Array<{ slotKey: string; blockKey: string }>): CanvasRecord {
    const r: CanvasRecord = { id: genId('cvs'), name, widgets: widgets ?? [], createdAt: new Date().toISOString() };
    this.canvases.push(r); return r;
  }

  // ── Memory Item ────────────────────────────────────────────────

  addMemoryItem(title: string, content: string, tags: string[] = []): MemoryItemRecord {
    const r: MemoryItemRecord = { id: genId('mem'), title, content, tags, createdAt: new Date().toISOString() };
    this.memoryItems.push(r); return r;
  }
  searchMemory(query: string): MemoryItemRecord[] {
    const lower = query.toLowerCase();
    return this.memoryItems.filter(m => m.title.toLowerCase().includes(lower) || m.content.toLowerCase().includes(lower) || m.tags.some(t => t.toLowerCase().includes(lower)));
  }

  // ── Review Thread ──────────────────────────────────────────────

  createReviewThread(subject: string, firstMessage?: { author: string; content: string }): ReviewThreadRecord {
    const r: ReviewThreadRecord = {
      id: genId('rev'), subject, status: 'open',
      messages: firstMessage ? [{ ...firstMessage, timestamp: new Date().toISOString() }] : [],
      createdAt: new Date().toISOString(),
    };
    this.reviewThreads.push(r); return r;
  }
  addReviewMessage(threadId: string, author: string, content: string): ReviewThreadRecord | null {
    const t = this.reviewThreads.find(r => r.id === threadId); if (!t) return null;
    t.messages.push({ author, content, timestamp: new Date().toISOString() }); return t;
  }
  resolveReviewThread(threadId: string): ReviewThreadRecord | null {
    const t = this.reviewThreads.find(r => r.id === threadId); if (!t) return null;
    t.status = 'resolved'; return t;
  }
  getOpenReviewThreads(): ReviewThreadRecord[] { return this.reviewThreads.filter(t => t.status === 'open' || t.status === 'in_progress'); }

  // ── Portal Task ────────────────────────────────────────────────

  createPortalTask(projectId: string, title: string, description?: string, source: string = 'portal'): AutomationPortalTaskRecord {
    const r: AutomationPortalTaskRecord = { id: genId('ptask'), projectId, title, description: description ?? null, status: 'open', source, assignee: null, createdAt: new Date().toISOString() };
    this.portalTasks.push(r); return r;
  }
  updatePortalTaskStatus(taskId: string, status: PortalTaskStatus): AutomationPortalTaskRecord | null {
    const t = this.portalTasks.find(x => x.id === taskId); if (!t) return null; t.status = status; return t;
  }
  getBacklogTasks(projectId?: string): AutomationPortalTaskRecord[] {
    let tasks = this.portalTasks.filter(t => t.status === 'open' || t.status === 'in_progress' || t.status === 'blocked');
    if (projectId) tasks = tasks.filter(t => t.projectId === projectId);
    return tasks;
  }

  // ── Config Profile + Values (with snapshot rollback) ───────────

  private configSnapshots: Map<string, Array<{ key: string; value: unknown }>> = new Map();

  createConfigProfile(key: string, description?: string): ConfigProfileRecord {
    const existing = this.configProfiles.find(p => p.key === key);
    if (existing) return existing;
    const r: ConfigProfileRecord = { id: genId('cprof'), key, description: description ?? null, createdAt: new Date().toISOString() };
    this.configProfiles.push(r); return r;
  }
  setConfigValue(profileKey: string, configKey: string, value: unknown): ConfigValueRecord {
    const profile = this.configProfiles.find(p => p.key === profileKey);
    if (!profile) throw new Error(`Config profile not found: ${profileKey}`);
    const existing = this.configValues.find(v => v.profileId === profile.id && v.key === configKey);
    if (existing) { existing.valueJson = value; return existing; }
    const r: ConfigValueRecord = { id: genId('cval'), profileId: profile.id, key: configKey, valueJson: value, createdAt: new Date().toISOString() };
    this.configValues.push(r); return r;
  }
  getConfigValue(profileKey: string, configKey: string): unknown | null {
    const profile = this.configProfiles.find(p => p.key === profileKey);
    if (!profile) return null;
    const val = this.configValues.find(v => v.profileId === profile.id && v.key === configKey);
    return val?.valueJson ?? null;
  }
  getConfigSnapshot(profileKey: string): Record<string, unknown> {
    const profile = this.configProfiles.find(p => p.key === profileKey);
    if (!profile) return {};
    const result: Record<string, unknown> = {};
    for (const v of this.configValues.filter(v => v.profileId === profile.id)) {
      result[v.key] = v.valueJson;
    }
    return result;
  }
  snapshotConfig(profileKey: string): void {
    this.configSnapshots.set(profileKey, Object.entries(this.getConfigSnapshot(profileKey)).map(([key, value]) => ({ key, value })));
  }
  rollbackConfig(profileKey: string): boolean {
    const snapshot = this.configSnapshots.get(profileKey);
    if (!snapshot) return false;
    const profile = this.configProfiles.find(p => p.key === profileKey);
    if (!profile) return false;
    // Remove current values for this profile
    const toRemove = this.configValues.filter(v => v.profileId === profile.id);
    for (const r of toRemove) { const idx = this.configValues.indexOf(r); if (idx >= 0) this.configValues.splice(idx, 1); }
    // Restore snapshot
    for (const { key, value } of snapshot) {
      this.configValues.push({ id: genId('cval'), profileId: profile.id, key, valueJson: value, createdAt: new Date().toISOString() });
    }
    return true;
  }

  // ── Summary ────────────────────────────────────────────────────

  summary(): Record<string, number> {
    return {
      modules: this.modules.length, blocks: this.blocks.length, layoutSlots: this.layoutSlots.length,
      nodes: this.nodes.length, queries: this.queries.length, connectors: this.connectors.length,
      canvases: this.canvases.length, memoryItems: this.memoryItems.length, reviewThreads: this.reviewThreads.length,
      portalTasks: this.portalTasks.length, configProfiles: this.configProfiles.length, configValues: this.configValues.length,
    };
  }

  clear(): void {
    for (const key of Object.keys(this) as Array<keyof WaveEStore>) {
      if (Array.isArray(this[key])) (this[key] as unknown[]).length = 0;
      if (key === 'configSnapshots') (this[key] as Map<string, unknown>).clear();
    }
  }
}
