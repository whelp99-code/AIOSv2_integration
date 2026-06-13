import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  getIntegrationBaseUrl,
  getIntegrationTarget,
  INTEGRATION_TARGETS,
  type IntegrationProjectId,
  type IntegrationTarget,
} from '@aios/shared';

export type IntegrationReachability = 'ok' | 'degraded' | 'unreachable' | 'planned';

export interface IntegrationHealthResult {
  id: IntegrationProjectId;
  name: string;
  integrationRole: string;
  upstream: string;
  status: IntegrationReachability;
  probeMode: IntegrationTarget['probeMode'];
  details?: string;
  payload?: Record<string, unknown>;
}

export interface IntegrationHealthReport {
  checkedAt: string;
  summary: {
    total: number;
    ok: number;
    degraded: number;
    unreachable: number;
    planned: number;
  };
  projects: IntegrationHealthResult[];
}

export type IntegrationFetch = typeof fetch;

export async function probeIntegrationTarget(
  target: IntegrationTarget,
  options: {
    env?: NodeJS.ProcessEnv;
    fetchImpl?: IntegrationFetch;
    workspaceRoot?: string;
    timeoutMs?: number;
  } = {},
): Promise<IntegrationHealthResult> {
  const env = options.env ?? process.env;
  const fetchImpl = options.fetchImpl ?? fetch;
  const upstream = getIntegrationBaseUrl(target.id, env);

  if (target.probeMode === 'filesystem') {
    const workspaceRoot = options.workspaceRoot ?? process.cwd();
    const relativePath = upstream || `../${target.name}`;
    const resolvedPath = upstream.startsWith('/') ? upstream : join(workspaceRoot, relativePath);
    const exists = existsSync(resolvedPath);

    return {
      id: target.id,
      name: target.name,
      integrationRole: target.integrationRole,
      upstream: resolvedPath,
      status: exists ? 'planned' : 'unreachable',
      probeMode: target.probeMode,
      details: exists ? 'Repository path detected; HTTP integration pending.' : 'Repository path not found.',
    };
  }

  const healthUrl = `${upstream.replace(/\/$/, '')}${target.healthPath}`;

  try {
    const response = await fetchImpl(healthUrl, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(options.timeoutMs ?? 5000),
    });

    const payload = await parseJsonSafe(response);
    const statusValue = typeof payload?.status === 'string' ? payload.status : undefined;

    if (!response.ok) {
      return {
        id: target.id,
        name: target.name,
        integrationRole: target.integrationRole,
        upstream,
        status: statusValue === 'degraded' ? 'degraded' : 'unreachable',
        probeMode: target.probeMode,
        details: `HTTP ${response.status}`,
        payload,
      };
    }

    return {
      id: target.id,
      name: target.name,
      integrationRole: target.integrationRole,
      upstream,
      status: statusValue === 'degraded' ? 'degraded' : 'ok',
      probeMode: target.probeMode,
      payload,
    };
  } catch (error) {
    return {
      id: target.id,
      name: target.name,
      integrationRole: target.integrationRole,
      upstream,
      status: 'unreachable',
      probeMode: target.probeMode,
      details: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function probeAllIntegrations(
  options: {
    env?: NodeJS.ProcessEnv;
    fetchImpl?: IntegrationFetch;
    workspaceRoot?: string;
    timeoutMs?: number;
  } = {},
): Promise<IntegrationHealthReport> {
  const projects = await Promise.all(
    INTEGRATION_TARGETS.map((target) => probeIntegrationTarget(target, options)),
  );

  const summary = {
    total: projects.length,
    ok: projects.filter((project) => project.status === 'ok').length,
    degraded: projects.filter((project) => project.status === 'degraded').length,
    unreachable: projects.filter((project) => project.status === 'unreachable').length,
    planned: projects.filter((project) => project.status === 'planned').length,
  };

  return {
    checkedAt: new Date().toISOString(),
    summary,
    projects,
  };
}

async function parseJsonSafe(response: Response): Promise<Record<string, unknown> | undefined> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}
