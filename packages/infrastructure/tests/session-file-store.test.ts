import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { CollaborationSessionFileStore } from '../src/collaboration/session-file-store';

describe('CollaborationSessionFileStore', () => {
  it('persists and reloads collaboration state from disk', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'aios-collab-'));
    const filePath = join(dir, `${randomUUID()}.json`);
    const store = new CollaborationSessionFileStore({
      filePath,
      workspaceRoot: '/repo',
    });

    const state = await store.loadState();
    expect(state.sessions.length).toBeGreaterThan(0);
    expect(state.projects.map((project) => project.name)).toContain('AIOS v1');

    state.sessions[0].status = 'completed';
    await store.saveState(state);

    const raw = await readFile(filePath, 'utf8');
    const reloaded = await store.loadState();

    expect(raw).toContain('"status": "completed"');
    expect(reloaded.sessions[0].status).toBe('completed');
  });
});
