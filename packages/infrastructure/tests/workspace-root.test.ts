import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveAiosWorkspaceRoot } from '../src/collaboration/workspace-root';

describe('resolveAiosWorkspaceRoot', () => {
  it('finds workspace root by walking up to collaboration-state.json', async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), 'aios-root-'));
    const contextDir = join(tempRoot, '.aios', 'context');
    await mkdir(contextDir, { recursive: true });
    await writeFile(join(contextDir, 'collaboration-state.json'), '{}', 'utf8');

    const nestedDir = join(tempRoot, 'apps', 'web');
    await mkdir(nestedDir, { recursive: true });

    expect(resolveAiosWorkspaceRoot(nestedDir)).toBe(tempRoot);
  });
});
