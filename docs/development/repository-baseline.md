# Repository Baseline

## Project Overview
- **Project Name:** AIOSv2_integration
- **Repository:** https://github.com/whelp99-code/AIOSv2_integration.git
- **Architecture:** Modular Monolith Monorepo
- **Tech Stack:** Turborepo + pnpm, Next.js 16, tRPC, Prisma, PostgreSQL

## Current Structure

```
AIOSv2_integration/
├─ apps/
│  ├─ web/                  # Next.js UI
│  ├─ api/                  # Express API / tRPC
│  └─ voice/                # JARVIS Voice
├─ packages/
│  ├─ domain/               # Domain layer / DDD
│  ├─ application/          # Application layer
│  ├─ infrastructure/       # Infrastructure layer / adapters
│  ├─ shared/               # Shared utilities
│  └─ ui/                   # UI components
├─ plugins/                 # Plugin system
├─ tools/                   # Development tools
├─ tests/                   # Tests
└─ docs/                    # Documentation
```

## Integration Targets

| Project | Description | Port |
|---------|-------------|------|
| AIOS v1 | Mail Intelligence, User Management | 3100 |
| F-aios-v3-core | Workflow Engine, Monitoring | 3200 |
| sangfor-mcp-workflow | MCP Integration, Security Policies | - |
| vibe-coding-os | Learning System, RAG, Agent Framework | - |
| AIOS-JARVIS | Voice Interface, LM Studio Integration | - |

## Development Tools

| Tool | Role | Responsibility |
|------|------|----------------|
| Hermes | PM/Architect | Phase planning, task management |
| opencode | Developer | Code implementation |
| Kanban | Task Management | Status tracking |

## Phase Plan

| Phase | Name | Branch |
|-------|------|--------|
| Phase 1 | Repository Baseline & Workspace | phase/1-repo-baseline-and-workspace |
| Phase 2 | Core Workflow Domain/Application | phase/2-core-workflow-domain-application |
| Phase 3 | Agent Runtime: Hermes + opencode | phase/3-agent-runtime-hermes-opencode |
| Phase 4 | GitHub PR Automation | phase/4-github-pr-automation |
| Phase 5 | Kanban Integration | phase/5-kanban-integration |
| Phase 6 | Final Integration & Gap Analysis | phase/6-final-integration-and-gap-analysis |
| Phase 7 | v2.0.1 Enhancement Plan | phase/7-v201-roadmap |

## Current Status
- **Created:** 2026-06-10
- **Branch:** phase/1-repo-baseline-and-workspace
- **Status:** Development In Progress
