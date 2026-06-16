import type { ApprovalRequest } from "@aios/domain";
import {
  COLLABORATION_SESSION_ID,
  recordApprovalArtifact,
} from "./approval-gate";
import { getCollaborationServices } from "../collaboration/server";

export type MailReadOperation =
  | "mail-analyze"
  | "mail-sync"
  | "mail-thread-insights"
  | "mail-candidates"
  | "mail-attachments";

export async function recordMailReadEvidence(input: {
  operation: MailReadOperation;
  target: string;
  context?: Record<string, unknown>;
}): Promise<void> {
  const { coordinator } = getCollaborationServices();
  await coordinator.addArtifact(COLLABORATION_SESSION_ID, {
    type: "log",
    path: "",
    description: input.target,
    createdAt: new Date(),
    metadata: {
      mailOperation: input.operation,
      ...input.context,
    },
  });
}

export async function recordMailDestructiveEvidence(
  approval: ApprovalRequest,
  description: string,
): Promise<void> {
  await recordApprovalArtifact(approval, description);
}
