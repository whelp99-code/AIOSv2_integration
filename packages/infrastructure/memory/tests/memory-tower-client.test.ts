import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';

const spawnMock = vi.fn();

vi.mock('node:child_process', () => ({
  spawn: spawnMock,
}));

class MockChildProcess extends EventEmitter {
  stdout = new EventEmitter();
  stderr = new EventEmitter();
  stdin = {
    write: vi.fn(),
    end: vi.fn(),
  };
  kill = vi.fn();
}

describe('MemoryTowerClient', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('초기화 후 memory_search 결과 배열을 반환한다', async () => {
    const child = new MockChildProcess();
    spawnMock.mockReturnValue(child);

    const { MemoryTowerClient } = await import('../src/memory-tower-client');
    const client = new MemoryTowerClient({
      mem0ServerPath: '/tmp/mem0.py',
      ragServerPath: '/tmp/rag.py',
      timeoutMs: 1000,
    });

    const promise = client.searchMemory('approval queue', 3);

    child.stdout.emit(
      'data',
      Buffer.from(
        `${JSON.stringify({ jsonrpc: '2.0', id: 0, result: { content: [{ text: '{}' }] } })}\n${JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          result: {
            content: [
              {
                text: JSON.stringify({
                  memories: [{ id: 'mem-1', content: '승인 대기 문서' }],
                }),
              },
            ],
          },
        })}\n`,
      ),
    );
    child.emit('close', 0);

    await expect(promise).resolves.toEqual([{ id: 'mem-1', content: '승인 대기 문서' }]);
    expect(spawnMock).toHaveBeenCalledWith('python3', ['/tmp/mem0.py'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    expect(child.stdin.write).toHaveBeenCalledTimes(1);
  });

  it('비정상 종료 시 MCP 오류를 전파한다', async () => {
    const child = new MockChildProcess();
    spawnMock.mockReturnValue(child);

    const { MemoryTowerClient } = await import('../src/memory-tower-client');
    const client = new MemoryTowerClient({
      mem0ServerPath: '/tmp/mem0.py',
      ragServerPath: '/tmp/rag.py',
      timeoutMs: 1000,
    });

    const promise = client.addKnowledge('메일 정책', '승인 기반 전송 정책', 'test');

    child.stderr.emit('data', Buffer.from('traceback'));
    child.emit('close', 1);

    await expect(promise).rejects.toThrow('MCP server exited with code 1: traceback');
  });
});
