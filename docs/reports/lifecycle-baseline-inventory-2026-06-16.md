# Lifecycle Baseline Inventory - 2026-06-16

## Git Status Snapshot

```
?? ".aios/context/approval-queue 2.json"
?? ".aios/context/collaboration-state 2.json"
?? .aios/runtime/
?? .hermes/plans/dev-loop-tooling-apply-plan.md
?? .hermes/plans/phase-b-1/preflight-check-result.md
?? .hermes/scripts/
?? docs/reports/invoice-2026-06-14.md
?? docs/reports/invoice-template.md
?? docs/reports/phase-plan-v1-tax-invoice-app.md
```

## Canonical Lifecycle Documents

| Document                                                      | Status  |
| ------------------------------------------------------------- | ------- |
| `docs/reports/aios-product-prd-2026-06-16.md`                 | Present |
| `docs/reports/aios-integration-blueprint-2026-06-16.md`       | Present |
| `docs/reports/aios-development-completion-plan-2026-06-16.md` | Present |

## Untracked File Classification

| Group         | Files                                                           | Action                                         |
| ------------- | --------------------------------------------------------------- | ---------------------------------------------- |
| **보존**      | `.aios/runtime/*`, `.aios/context/* 2.json`                     | Runtime/session artifacts — do not delete      |
| **보존**      | `.hermes/plans/*`, `.hermes/scripts/*`                          | Hermes planning artifacts                      |
| **검토**      | `docs/reports/invoice-*.md`, `phase-plan-v1-tax-invoice-app.md` | Tax/invoice planning — separate from lifecycle |
| **삭제 후보** | None identified                                                 | No deletion without approval                   |

## product-integration-blueprint-status.md

Last updated **2026-06-14** — predates 2026-06-16 lifecycle canonical docs. Follow-up: refresh progress axes after C1–C10 implementation.

## Risk Notes

- No tracked code changes in worktree; lifecycle work adds new domain/API layers.
- DB migration/push remains approval-gated per directives.
- Mail Intelligence, F-aios-v3, MCP-workflow, Vibe remain external; proxy/adapter only.

## Next Actions

1. Implement C1–C9 domain/use-case/API layers.
2. Run typecheck and targeted vitest suites (C10).
3. Update `product-integration-blueprint-status.md` after verification.
