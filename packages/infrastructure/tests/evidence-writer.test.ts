import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CollaborationEvidenceWriter } from '../src/collaboration/evidence-writer';
import type { CollaborationSession } from '@aios/domain';

describe('CollaborationEvidenceWriter', () => {
  it('writes session evidence markdown to the configured output directory', async () => {
    const outputDir = await mkdtemp(join(tmpdir(), 'aios-evidence-'));
    const writer = new CollaborationEvidenceWriter({ outputDir });
    const session: CollaborationSession = {
      id: 'cursor-opencode-main-session',
      title: 'Test session',
      objective: 'Verify evidence output',
      status: 'in-progress',
      owner: 'cursor',
      participants: [
        {
          tool: 'cursor',
          role: 'orchestrator',
          displayName: 'Cursor',
          active: true,
          capabilities: ['planning'],
        },
      ],
      assignments: [
        {
          id: 'assignment-1',
          title: 'Queued task',
          description: 'desc',
          assignedTo: 'opencode',
          role: 'implementer',
          targetFiles: [],
          requiredApprovals: [],
          status: 'queued',
          createdAt: new Date('2026-06-13T00:00:00.000Z'),
          updatedAt: new Date('2026-06-13T00:00:00.000Z'),
          metadata: {},
        },
      ],
      handoffs: [],
      artifacts: [],
      createdAt: new Date('2026-06-13T00:00:00.000Z'),
      updatedAt: new Date('2026-06-13T00:00:00.000Z'),
      metadata: {},
    };

    const filePath = await writer.writeSessionSummary(session, []);
    const content = await readFile(filePath, 'utf8');

    expect(filePath).toBe(join(outputDir, 'cursor-opencode-main-session.md'));
    expect(content).toContain('## objective');
    expect(content).toContain('Verify evidence output');
    expect(content).toContain('Queued task | opencode | queued');
    expect(content).toContain('## remaining work');
  });
});
