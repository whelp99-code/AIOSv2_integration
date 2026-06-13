import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { ApprovalFileStore } from "../src/collaboration/approval-file-store";

describe("ApprovalFileStore action types", () => {
  it("preserves data-mutation, config-change, and device-control on reload", async () => {
    const dir = await mkdtemp(join(tmpdir(), "aios-approval-"));
    const filePath = join(dir, `${randomUUID()}.json`);
    const store = new ApprovalFileStore({ filePath });

    const actionTypes = [
      "data-mutation",
      "config-change",
      "device-control",
    ] as const;

    for (const actionType of actionTypes) {
      await store.create({
        sessionId: "session-1",
        assignmentId: "assignment-1",
        requestedBy: "tester",
        actionType,
        target: `target:${actionType}`,
        status: "pending",
        reason: "test",
      });
    }

    const reloaded = await store.list();
    const byType = Object.fromEntries(
      reloaded.map((entry) => [entry.actionType, entry]),
    );

    for (const actionType of actionTypes) {
      expect(byType[actionType]?.actionType).toBe(actionType);
    }

    const raw = await readFile(filePath, "utf8");
    for (const actionType of actionTypes) {
      expect(raw).toContain(`"${actionType}"`);
    }
  });
});
