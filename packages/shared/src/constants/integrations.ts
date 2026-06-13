import { PORTS } from './ports';

export type IntegrationProjectId =
  | 'aios-v1'
  | 'f-aios-v3-core'
  | 'sangfor-mcp-workflow'
  | 'vibe-coding-os'
  | 'whelp99-code-sangfor-engineer-mcp';

export interface IntegrationTarget {
  id: IntegrationProjectId;
  name: string;
  envKey: string;
  defaultUrl: string;
  healthPath: string;
  integrationRole: string;
  probeMode: 'http' | 'filesystem';
  readinessNote?: string;
}

export const INTEGRATION_TARGETS: IntegrationTarget[] = [
  {
    id: 'aios-v1',
    name: 'AIOS v1',
    envKey: 'AIOS_V1_URL',
    defaultUrl: `http://localhost:${PORTS.WEB + 1}`,
    healthPath: '/api/health',
    integrationRole: 'upstream source',
    probeMode: 'http',
  },
  {
    id: 'f-aios-v3-core',
    name: 'F-aios-v3-core',
    envKey: 'F_AIOS_V3_URL',
    defaultUrl: `http://localhost:${PORTS.API}`,
    healthPath: '/health',
    integrationRole: 'workflow engine',
    probeMode: 'http',
  },
  {
    id: 'sangfor-mcp-workflow',
    name: 'sangfor-mcp-workflow',
    envKey: 'SANGFOR_MCP_URL',
    defaultUrl: 'http://localhost:3500',
    healthPath: '/api/system/health',
    integrationRole: 'mcp workflow',
    probeMode: 'http',
  },
  {
    id: 'vibe-coding-os',
    name: 'vibe-coding-os',
    envKey: 'VIBE_CODING_OS_URL',
    defaultUrl: 'http://localhost:4000',
    healthPath: '/api/health',
    integrationRole: 'knowledge and agent framework',
    probeMode: 'http',
  },
  {
    id: 'whelp99-code-sangfor-engineer-mcp',
    name: 'whelp99-code-sangfor-engineer-mcp',
    envKey: 'WHELP99_MCP_PATH',
    defaultUrl: '',
    healthPath: '',
    integrationRole: 'mcp extension',
    probeMode: 'filesystem',
    readinessNote: 'HTTP bridge planned for Phase 5; filesystem probe only in Phase 4.',
  },
];

export function getIntegrationTarget(id: IntegrationProjectId): IntegrationTarget {
  const target = INTEGRATION_TARGETS.find((entry) => entry.id === id);
  if (!target) {
    throw new Error(`Unknown integration target: ${id}`);
  }
  return target;
}

export function getIntegrationBaseUrl(id: IntegrationProjectId, env: NodeJS.ProcessEnv = process.env): string {
  const target = getIntegrationTarget(id);
  if (target.probeMode === 'filesystem') {
    return env[target.envKey] ?? '';
  }
  return env[target.envKey] ?? target.defaultUrl;
}
