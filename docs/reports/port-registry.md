# Integration Port Registry

Canonical source: [`packages/config/src/ports.ts`](../../packages/config/src/ports.ts)

Verify: `pnpm integration:ports`

## Live integration stack

| Service | Port | Project |
| ------- | ---- | ------- |
| Mail Intelligence | **3010** | `apps/mail-intelligence` |
| AIOS v1 web | **3101** | `AIOS v1/apps/web` |
| AIOSv2 Portal web | **3110** | `AIOSv2_integration/apps/web` |
| AIOSv2 API | **3200** | `AIOSv2_integration/apps/api` |
| F-aios-v3 workflow server | **3201** | `F - aios-v3-core/server` |
| Sangfor MCP operator | **3500** | `sangfor-mcp-workflow` |
| whelp99 operator console | **3502** | `whelp99-code-sangfor-engineer-mcp` |
| Vibe Coding OS | **4000** | `vibe-coding-os` |
| CFO-AI API | **4100** | `CFO-AI/apps/api` |
| whelp99 MCP HTTP bridge | **3600** | `whelp99-code-sangfor-engineer-mcp` |

## Resolved conflicts (2026-06-14)

| Ports | Was | Fix |
| ----- | --- | --- |
| **4000** | vibe-coding-os vs CFO-AI API | CFO-AI default → **4100** |
| **3500** | sangfor-mcp vs whelp99 operator | whelp99 operator → **3502** |
| **3200** | AIOSv2 API vs F-aios-v3 server | F-aios-v3 default → **3201** |
| **10200** | mail-intelligence legacy docs | Standardized to **3010** |
| **3100** | AIOS v1 test BASE_URL | Dev server is **3101**; portal web is **3110** |

## Infra (not app HTTP)

| Service | Host port |
| ------- | --------- |
| AIOS v1 Postgres | 5434 |
| AIOS v1 Redis | 6380 |
| vibe Postgres | 5433 |
