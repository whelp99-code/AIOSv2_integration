import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CommandAgentRuntime,
  createCursorRuntime,
} from "../../packages/infrastructure/src/agents/command-agent-runtime";

describe("CommandAgentRuntime", () => {
  it("executes a local command and returns a completed job", async () => {
    const runtime = new CommandAgentRuntime({
      agentType: "opencode",
      command: "sh",
      argsBuilder: () => ["-lc", 'printf "runtime-ok"'],
    });

    const job = await runtime.executeJob({
      taskId: "task-1",
      agentType: "opencode",
      input: {
        task: "test runtime",
        context: {},
        constraints: [],
      },
    });

    expect(job.status).toBe("completed");
    expect(String(job.output?.result)).toContain("runtime-ok");
  });

  it("routes cursor runtime through the agent CLI shape", async () => {
    const dir = await mkdtemp(join(tmpdir(), "aios-cursor-runtime-"));
    const script = join(dir, "cursor-agent.sh");

    await writeFile(script, '#!/bin/sh\nprintf "%s" "$@"\n', {
      mode: 0o755,
    });

    const previous = process.env.CURSOR_AGENT_COMMAND;
    process.env.CURSOR_AGENT_COMMAND = script;

    try {
      const runtime = createCursorRuntime(dir);
      const job = await runtime.executeJob({
        taskId: "task-2",
        agentType: "manual",
        input: {
          task: "Inspect collaboration routing",
          context: {},
          constraints: [],
        },
      });

      expect(job.status).toBe("completed");
      expect(String(job.output?.result)).toContain("--print");
      expect(String(job.output?.result)).toContain("--trust");
      expect(String(job.output?.result)).toContain("--workspace");
      expect(String(job.output?.result)).toContain(dir);
      expect(String(job.output?.result)).toContain(
        "Inspect collaboration routing",
      );
    } finally {
      if (previous === undefined) {
        delete process.env.CURSOR_AGENT_COMMAND;
      } else {
        process.env.CURSOR_AGENT_COMMAND = previous;
      }
    }
  });
});
