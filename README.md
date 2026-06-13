# AIOS v2 Integration

> **Unified Platform for AIOS Ecosystem**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![Turborepo](https://img.shields.io/badge/Turborepo-2.0-red.svg)](https://turbo.build/)

## Overview

AIOS v2 Integration is a **modular monolith monorepo** that unifies 5 separate projects into a single, maintainable platform:

- **AIOS v1** - Mail Intelligence, User Management
- **F-aios-v3-core** - Workflow Engine, Monitoring
- **sangfor-mcp-workflow** - MCP Integration, Security Policies
- **vibe-coding-os** - Learning System, RAG, Agent Framework
- **AIOS-JARVIS** - Voice Interface, LM Studio Integration

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    AIOS Unified Platform                         │
├─────────────────────────────────────────────────────────────────┤
│  Presentation Layer (Next.js 16 + shadcn/ui)                    │
│  Application Layer (tRPC + Service Layer)                       │
│  Domain Layer (Bounded Contexts - DDD)                          │
│  Infrastructure Layer (Ports & Adapters)                        │
└─────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Monorepo | Turborepo + pnpm |
| Frontend | Next.js 16, shadcn/ui, Tailwind CSS |
| API | tRPC, Express |
| Database | Prisma, PostgreSQL |
| LLM | Mastra, LM Studio |
| RAG | LightRAG, pgvector |
| Monitoring | Langfuse |
| Testing | Vitest, Playwright |
| CI/CD | GitHub Actions |

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 10
- PostgreSQL
- LM Studio (optional)

### Installation

```bash
# Clone the repository
git clone https://github.com/whelp99-code/AIOSv2_integration.git
cd AIOSv2_integration

# Install dependencies
pnpm install

# Set up environment
cp .env.example .env.local

# Build all packages
pnpm build

# Start development
pnpm dev
```

## Project Structure

```
AIOSv2_integration/
├─ apps/                    # Applications
│  ├─ web/                  # Next.js UI (:3110)
│  ├─ api/                  # Express API (:3200)
│  └─ voice/                # JARVIS Voice (:3310)
├─ packages/                # Shared packages
│  ├─ domain/               # Domain layer (DDD)
│  ├─ application/          # Application layer
│  ├─ infrastructure/       # Infrastructure layer
│  ├─ shared/               # Shared utilities
│  └─ ui/                   # UI components
├─ plugins/                 # Plugin system
├─ tools/                   # Development tools
├─ tests/                   # Tests
└─ docs/                    # Documentation
```

## Development

```bash
# Development
pnpm dev

# Build
pnpm build

# Test
pnpm test

# Lint
pnpm lint

# Type check
pnpm typecheck
```

## Port Allocation

| Service | Port | Description |
|---------|------|-------------|
| Web UI | 3110 | Next.js |
| API Server | 3200 | Express/tRPC |
| LightRAG | 3300 | FastAPI |
| Dashboard | 3400 | Static HTML |
| JARVIS | 3310 | Python |
| LM Studio | 1234 | External |

## Documentation

- [Architecture](docs/architecture/)
- [API Reference](docs/api/)
- [Guides](docs/guides/)
- [Blueprint](docs/AIOS-UNIFIED-PLATFORM-BLUEPRINT.md)

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Turborepo](https://turbo.build/) - Monorepo build system
- [Next.js](https://nextjs.org/) - React framework
- [Prisma](https://www.prisma.io/) - Database ORM
- [tRPC](https://trpc.io/) - Type-safe API
- [Mastra](https://mastra.ai/) - AI agent framework