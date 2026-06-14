# Codex CLI to opencode/cursor Command Reference

**Date:** 2026-06-14  
**Scope:** Current workspace command routing and execution boundaries

## Summary

This repository can invoke `opencode` directly. `cursor` is present as the editor launcher CLI, but there is no `cursor agent` entrypoint in this environment.

## Command Table

| Purpose | Command | Use |
|---|---|---|
| Non-interactive opencode run | `opencode run "<prompt>"` | Generate or implement code in the current workspace. |
| Resume opencode session | `opencode --continue` / `opencode --session <id>` | Continue a prior run. |
| Inspect opencode state | `opencode session` / `opencode stats` | Review session and usage data. |
| Open workspace in Cursor | `cursor <path>` | Launch the editor on a folder or file. |
| Jump to a location in Cursor | `cursor -g <file:line[:character]>` | Open at a specific line. |
| Open a new Cursor window | `cursor -n <path>` | Start a separate editor window. |

## What the Repo Already Uses

| Package script | Backing file | Purpose |
|---|---|---|
| `pnpm collaboration:run` | `scripts/run-collaboration-contract.ts` | Bootstrap the shared collaboration session. |
| `pnpm collaboration:continue` | `scripts/continue-collaboration-queue.ts` | Continue queued collaboration work. |
| `pnpm collaboration:dispatch-opencode` | `scripts/dispatch-opencode-phase5.ts` | Dispatch Phase 5 implementation tasks to opencode. |
| `pnpm collaboration:dispatch-opencode-phase6` | `scripts/dispatch-opencode-phase6.ts` | Dispatch Phase 6 diagnostic fixes to opencode. |
| `pnpm collaboration:dispatch-opencode-fix` | `scripts/dispatch-opencode-fix-directive.ts` | Dispatch Codex review follow-up fixes to opencode. |
| `pnpm collaboration:dispatch-opencode-phase7` | `scripts/dispatch-opencode-phase7-remediation.ts` | Dispatch Phase 7 remediation tasks to opencode. |

## Runtime Boundaries

- `OPENCODE_COMMAND` is the real override for opencode execution.
- `CURSOR_AGENT_COMMAND` is documented in the collaboration contract, but this workspace currently resolves `cursor` as the editor launcher and not an agent CLI.
- For command-driven code generation, route to `opencode`.
- For inspection, file jumps, and editor navigation, route to `cursor`.

## Verification Notes

- `command -v opencode` resolves successfully in this environment.
- `command -v cursor` resolves successfully in this environment.
- `opencode --help` includes `run`, `session`, `stats`, and `pr`.
- `cursor --help` exposes editor and window-management flags, not agent execution.

## Recommendation

If a workflow needs an agent-backed implementation step, use `opencode run "<prompt>"`.
If a workflow only needs editor navigation or file opening, use `cursor`.
