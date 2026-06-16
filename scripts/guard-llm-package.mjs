#!/usr/bin/env node
/**
 * Guard: packages/infrastructure/llm must stay a real directory.
 * Root `pnpm install` can replace it with a broken symlink — restore before install.
 */
import { existsSync, lstatSync, rmSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const LLM = join(ROOT, "packages/infrastructure/llm");

function main() {
  if (!existsSync(LLM)) {
    console.warn("[guard-llm] missing — restoring from git");
    execSync("git checkout HEAD -- packages/infrastructure/llm", {
      cwd: ROOT,
      stdio: "inherit",
    });
    return;
  }
  const stat = lstatSync(LLM);
  if (stat.isSymbolicLink()) {
    console.warn("[guard-llm] broken symlink detected — restoring from git");
    rmSync(LLM);
    execSync("git checkout HEAD -- packages/infrastructure/llm", {
      cwd: ROOT,
      stdio: "inherit",
    });
  }
}

main();
