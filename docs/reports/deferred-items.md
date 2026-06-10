# Deferred Items

## Overview
Items deferred from Phase 1-6 development to v2.0.1 or later phases.

## Deferred by Phase

### Phase 1 - Repository Baseline
- None

### Phase 2 - Core Workflow
- **Database Schema:** Prisma schema definition deferred
- **Repository Implementations:** In-memory implementations used, DB implementations deferred

### Phase 3 - Agent Runtime
- **Real Agent Integration:** Actual Hermes/opencode execution deferred
- **Process Management:** Agent lifecycle management deferred

### Phase 4 - GitHub PR Automation
- **Octokit Integration:** Real GitHub API calls deferred
- **Authentication:** GitHub token management deferred

### Phase 5 - Kanban Integration
- **UI Components:** Kanban board UI deferred
- **Real-time Updates:** WebSocket integration deferred

### Phase 6 - Final Integration
- **Testing:** All testing deferred to verification phase
- **Build:** Build verification deferred

## External Dependencies Required

| Dependency | Required For | Status |
|------------|--------------|--------|
| PostgreSQL Database | Data persistence | Deferred |
| GitHub Token | GitHub API access | Deferred |
| LM Studio | LLM integration | Available |
| Langfuse Account | Monitoring | Deferred |

## Technical Debt

1. **TypeScript Configuration:** Need to configure proper tsconfig for all packages
2. **Package Dependencies:** Need to install and configure all dependencies
3. **Build System:** Need to configure Turborepo build pipeline
4. **Testing Framework:** Need to set up Vitest configuration

## Resolution Plan

### v2.0.1 Priority
1. Database layer setup
2. Authentication system
3. Unit tests for existing code
4. Basic UI components

### v2.0.2 Priority
1. Real GitHub integration
2. Monitoring setup
3. RAG system integration
4. Advanced UI features

## Notes
All deferred items are documented and prioritized for future development phases.
