import { describe, expect, it } from 'vitest'
import { CommandAgentRuntime } from '../src/agents/command-agent-runtime'

describe('CommandAgentRuntime', () => {
  it('executes a local command and returns a completed job', async () => {
    const runtime = new CommandAgentRuntime({
      agentType: 'opencode',
      command: 'sh',
      argsBuilder: () => ['-lc', 'printf "runtime-ok"'],
    })

    const job = await runtime.executeJob({
      taskId: 'task-1',
      agentType: 'opencode',
      input: {
        task: 'test runtime',
        context: {},
        constraints: [],
      },
    })

    expect(job.status).toBe('completed')
    expect(String(job.output?.result)).toContain('runtime-ok')
  })
})
