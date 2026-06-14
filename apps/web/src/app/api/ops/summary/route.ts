import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse } from "next/server";
import {
  createCursorRuntime,
  createOpencodeRuntime,
  resolveAiosWorkspaceRoot,
} from "@aios/infrastructure";
import { getCollaborationServices } from "../../../../lib/collaboration/server";
import { GET as getOpsHealth } from "../health/route";

interface EvidenceLink {
  title: string;
  path: string;
  updatedAt?: string;
}

async function listEvidence(): Promise<EvidenceLink[]> {
  const workspaceRoot = resolveAiosWorkspaceRoot();
  const evidenceDir = join(workspaceRoot, "docs", "evidence");

  try {
    const entries = await readdir(evidenceDir, { withFileTypes: true });
    const files = await Promise.all(
      entries
        .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
        .map(async (entry) => {
          const absolutePath = join(evidenceDir, entry.name);
          const fileStat = await stat(absolutePath);
          return {
            title: entry.name.replace(/\.md$/, ""),
            path: `docs/evidence/${entry.name}`,
            updatedAt: fileStat.mtime.toISOString(),
          };
        }),
    );

    return files
      .sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""))
      .slice(0, 10);
  } catch {
    return [];
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const { approvalStore, coordinator } = getCollaborationServices();
    const [healthResponse, approvals, sessions, sessionSummary, evidence] =
      await Promise.all([
        getOpsHealth(),
        approvalStore.list(),
        coordinator.listSessions(),
        coordinator.getSummary(),
        listEvidence(),
      ]);

    const [cursorStatus, opencodeStatus] = await Promise.all([
      createCursorRuntime(resolveAiosWorkspaceRoot()).getStatus(),
      createOpencodeRuntime(resolveAiosWorkspaceRoot()).getStatus(),
    ]);

    return NextResponse.json({
      health: await readJson(healthResponse),
      approvals,
      sessions,
      sessionSummary,
      evidence,
      dispatch: {
        cursorAgentAvailable: cursorStatus.status !== "offline",
        opencodeAvailable: opencodeStatus.status !== "offline",
        cursorAgentStatus: cursorStatus.status,
        opencodeStatus: opencodeStatus.status,
      },
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Ops summary error:", error);
    return NextResponse.json(
      {
        error: "Ops summary를 생성할 수 없습니다.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
