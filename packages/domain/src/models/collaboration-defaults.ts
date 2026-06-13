/**
 * Shared collaboration workspace defaults
 */

import type { CollaborationParticipant, CollaborationWorkspaceProject } from './collaboration-session';

export function createDefaultCollaborationParticipants(): CollaborationParticipant[] {
  return [
    {
      tool: 'cursor',
      role: 'orchestrator',
      displayName: 'Cursor',
      active: true,
      capabilities: ['planning', 'review', 'navigation', 'verification'],
    },
    {
      tool: 'opencode',
      role: 'implementer',
      displayName: 'opencode',
      active: true,
      capabilities: ['implementation', 'refactor', 'testing', 'patching'],
    },
    {
      tool: 'codex',
      role: 'reviewer',
      displayName: 'Codex',
      active: true,
      capabilities: ['review', 'refactor-suggestion', 'cleanup'],
    },
  ];
}

export function createCollaborationWorkspaceProjects(rootDir: string): CollaborationWorkspaceProject[] {
  return [
    {
      name: 'AIOS v1',
      path: `${rootDir}/../AIOS v1`,
      description: '메일 수집, 고객/프로젝트 intake, upstream 소스',
      integrationRole: 'upstream source',
      status: 'active',
    },
    {
      name: 'F-aios-v3-core',
      path: `${rootDir}/../F - aios-v3-core`,
      description: '워크플로우 엔진과 모니터링 연동',
      integrationRole: 'workflow engine',
      status: 'active',
    },
    {
      name: 'sangfor-mcp-workflow',
      path: `${rootDir}/../sangfor-mcp-workflow`,
      description: 'MCP 통합과 보안 정책',
      integrationRole: 'mcp workflow',
      status: 'active',
    },
    {
      name: 'vibe-coding-os',
      path: `${rootDir}/../vibe-coding-os`,
      description: '학습 시스템, RAG, agent framework',
      integrationRole: 'knowledge and agent framework',
      status: 'active',
    },
    {
      name: 'whelp99-code-sangfor-engineer-mcp',
      path: `${rootDir}/../whelp99-code-sangfor-engineer-mcp`,
      description: '추가 MCP/도구 연동 대상',
      integrationRole: 'mcp extension',
      status: 'planned',
    },
  ];
}
