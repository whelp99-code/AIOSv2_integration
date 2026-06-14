import { NextResponse } from "next/server";
import { createDefaultParticipants } from "@aios/application";
import {
  isApprovalActionType,
  normalizeApprovalActionType,
  type ApprovalActionType,
  type CollaborationAssignment,
  type CollaborationTool,
} from "@aios/domain";
import {
  createCursorRuntime,
  createOpencodeRuntime,
  resolveAiosWorkspaceRoot,
} from "@aios/infrastructure";
import { getCollaborationServices } from "../../../../lib/collaboration/server";

type OpsDispatchTool = "opencode" | "cursor-agent";
type OpsDispatchMode = "plan" | "implement" | "verify";

const RISKY_ACTIONS = new Set<ApprovalActionType>([
  "delete",
  "send",
  "deploy",
  "external-share",
  "data-mutation",
  "config-change",
  "device-control",
  "financial",
  "user-management",
]);

function isTool(value: unknown): value is OpsDispatchTool {
  return value === "opencode" || value === "cursor-agent";
}

function isMode(value: unknown): value is OpsDispatchMode {
  return value === "plan" || value === "implement" || value === "verify";
}

function toTargetFiles(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function toCollaborationTool(tool: OpsDispatchTool): CollaborationTool {
  return tool === "opencode" ? "opencode" : "cursor";
}

function shouldRequireApproval(input: {
  mode: OpsDispatchMode;
  approvalAction?: ApprovalActionType;
}) {
  if (!input.approvalAction) return false;
  if (!RISKY_ACTIONS.has(input.approvalAction)) return false;
  return input.mode !== "verify";
}

async function getOrCreateOpsSession() {
  const { coordinator } = getCollaborationServices();
  const sessions = await coordinator.listSessions();
  const existing = sessions.find(
    (session) => session.metadata?.source === "ops-console",
  );
  if (existing) return existing;

  return coordinator.createSession({
    title: "Unified Ops Console Dispatch",
    objective: "Ops Console initiated agent dispatch and verification tasks",
    owner: "codex",
    participants: createDefaultParticipants(),
    metadata: {
      source: "ops-console",
      createdBy: "ops-dispatch-route",
    },
  });
}

function getRuntime(tool: OpsDispatchTool) {
  const cwd = resolveAiosWorkspaceRoot();
  return tool === "opencode"
    ? createOpencodeRuntime(cwd)
    : createCursorRuntime(cwd);
}

function getCommandSummary(job: {
  metadata: Record<string, unknown>;
  output?: { result: unknown };
  error?: string;
}) {
  return {
    command:
      typeof job.metadata.command === "string" ? job.metadata.command : "",
    args: Array.isArray(job.metadata.args) ? job.metadata.args : [],
    exitCode:
      typeof job.metadata.exitCode === "number"
        ? job.metadata.exitCode
        : undefined,
    summary:
      typeof job.output?.result === "string"
        ? job.output.result
        : job.error || "",
  };
}

async function createApproval(input: {
  assignment: CollaborationAssignment;
  approvalAction: ApprovalActionType;
  requestedBy: string;
}) {
  const { approvalStore, coordinator, evidenceWriter } =
    getCollaborationServices();
  const session = await getOrCreateOpsSession();
  const approval = await approvalStore.create({
    type: "destructive-action",
    sessionId: session.id,
    assignmentId: input.assignment.id,
    requester: input.requestedBy,
    requestedBy: input.requestedBy,
    actionType: input.approvalAction,
    target:
      input.assignment.targetFiles.join(", ") || input.assignment.description,
    context: {
      source: "ops-dispatch",
      assignmentTitle: input.assignment.title,
    },
    status: "pending",
  });

  const updatedAssignment = await coordinator.updateAssignment(
    session.id,
    input.assignment.id,
    {
      status: "waiting-for-approval",
      metadata: {
        approvalIds: [approval.id],
        approvalStatus: "pending",
      },
    },
  );

  await coordinator.addArtifact(session.id, {
    type: "approval-record",
    path: "",
    description: `Ops dispatch approval requested for ${input.assignment.title}`,
    createdAt: new Date(),
    metadata: {
      approvalId: approval.id,
      assignmentId: input.assignment.id,
      actionType: approval.actionType,
      status: approval.status,
    },
  });

  const updatedSession = await coordinator.getSession(session.id);
  if (updatedSession) {
    await evidenceWriter.writeSessionSummary(
      updatedSession,
      await approvalStore.list(),
    );
  }

  return { approval, assignment: updatedAssignment, session: updatedSession };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const tool = isTool(body.tool) ? body.tool : undefined;
    const mode = isMode(body.mode) ? body.mode : undefined;
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    const targetFiles = toTargetFiles(body.targetFiles);
    const approvalAction = isApprovalActionType(body.approvalAction)
      ? body.approvalAction
      : body.approvalAction
        ? normalizeApprovalActionType(body.approvalAction)
        : undefined;

    if (!tool || !mode || !prompt) {
      return NextResponse.json(
        { error: "tool, mode, prompt는 필수입니다." },
        { status: 400 },
      );
    }

    const { coordinator, approvalStore, evidenceWriter } =
      getCollaborationServices();
    const session = await getOrCreateOpsSession();
    const assignment = await coordinator.addAssignment(session.id, {
      title: `Ops ${mode}: ${prompt.slice(0, 80)}`,
      description: prompt,
      assignedTo: toCollaborationTool(tool),
      role: tool === "opencode" ? "implementer" : "reviewer",
      targetFiles,
      requiredApprovals: approvalAction ? [approvalAction] : [],
      metadata: {
        source: "ops-dispatch",
        mode,
        tool,
        approvalAction: approvalAction ?? null,
      },
    });

    if (shouldRequireApproval({ mode, approvalAction })) {
      const approvalResult = await createApproval({
        assignment,
        approvalAction: approvalAction!,
        requestedBy: tool,
      });

      return NextResponse.json(
        {
          success: false,
          approvalStatus: "pending",
          assignment: approvalResult.assignment,
          approval: approvalResult.approval,
          sessionStatus: approvalResult.session?.status ?? "waiting-for-review",
        },
        { status: 409 },
      );
    }

    const runtime = getRuntime(tool);
    await runtime.initialize();
    const runningAssignment = await coordinator.updateAssignment(
      session.id,
      assignment.id,
      {
        status: "running",
        metadata: {
          startedAt: new Date().toISOString(),
          startedBy: tool,
        },
      },
    );

    const job = await runtime.executeJob({
      taskId: runningAssignment.id,
      agentType: tool === "opencode" ? "opencode" : "manual",
      input: {
        task: prompt,
        context: {
          source: "ops-dispatch",
          mode,
          sessionId: session.id,
          assignmentId: runningAssignment.id,
          targetFiles,
        },
        constraints: [],
      },
    });
    await runtime.shutdown();

    const commandSummary = getCommandSummary(job);
    const completedAssignment = await coordinator.updateAssignment(
      session.id,
      assignment.id,
      {
        status: job.status === "completed" ? "done" : "failed",
        metadata: {
          jobId: job.id,
          command: commandSummary.command,
          args: commandSummary.args,
          exitCode: commandSummary.exitCode,
          summary: commandSummary.summary,
          completedAt: new Date().toISOString(),
          error: job.error,
        },
      },
    );

    await coordinator.addArtifact(session.id, {
      type: "log",
      path: "",
      description: `Ops dispatch ${tool} ${job.status}`,
      createdAt: new Date(),
      metadata: {
        assignmentId: completedAssignment.id,
        jobId: job.id,
        status: job.status,
        command: commandSummary.command,
        exitCode: commandSummary.exitCode,
        summary: commandSummary.summary,
        error: job.error,
      },
    });

    const updatedSession = await coordinator.getSession(session.id);
    if (updatedSession) {
      await evidenceWriter.writeSessionSummary(
        updatedSession,
        await approvalStore.list(),
      );
    }

    return NextResponse.json({
      success: job.status === "completed",
      approvalStatus: "not-required",
      assignment: completedAssignment,
      job,
      sessionStatus: updatedSession?.status ?? session.status,
    });
  } catch (error) {
    console.error("Ops dispatch error:", error);
    return NextResponse.json(
      {
        error: "Ops dispatch 실행에 실패했습니다.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
