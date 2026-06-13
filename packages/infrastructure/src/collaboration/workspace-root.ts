import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

export function resolveAiosWorkspaceRoot(cwd = process.cwd()): string {
  if (process.env.AIOS_WORKSPACE_ROOT) {
    return resolve(process.env.AIOS_WORKSPACE_ROOT);
  }

  if (process.env.AIOS_COLLABORATION_STATE_PATH) {
    return resolve(process.env.AIOS_COLLABORATION_STATE_PATH, '..', '..');
  }

  let current = resolve(cwd);
  for (let depth = 0; depth < 8; depth += 1) {
    if (existsSync(join(current, '.aios', 'context', 'collaboration-state.json'))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  return resolve(cwd);
}
