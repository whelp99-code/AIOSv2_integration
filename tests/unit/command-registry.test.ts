import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

let CommandRegistry: typeof import('@/lib/services/command-registry').CommandRegistry;
let resetCommandRegistry: typeof import('@/lib/services/command-registry').resetCommandRegistry;

beforeEach(async () => {
  vi.resetModules();
  process.env.NEXT_PUBLIC_AIOS_V1_REAL_LOGIC = 'false';
  const mod = await import('@/lib/services/command-registry');
  CommandRegistry = mod.CommandRegistry;
  resetCommandRegistry = mod.resetCommandRegistry;
});

afterEach(() => {
  delete process.env.NEXT_PUBLIC_AIOS_V1_REAL_LOGIC;
  resetCommandRegistry();
  vi.restoreAllMocks();
});

describe('CommandRegistry', () => {
  it('인스턴스를 생성할 수 있다', () => {
    const registry = new CommandRegistry();
    expect(registry).toBeDefined();
  });

  it('기본 6개 명령어가 등록되어 있다', () => {
    const registry = new CommandRegistry();
    expect(registry.list()).toHaveLength(6);
  });

  it('analyze 명령어가 등록되어 있다', () => {
    const registry = new CommandRegistry();
    expect(registry.has('analyze')).toBe(true);
  });

  it('plan 명령어가 등록되어 있다', () => {
    const registry = new CommandRegistry();
    expect(registry.has('plan')).toBe(true);
  });

  it('risk 명령어가 등록되어 있다', () => {
    const registry = new CommandRegistry();
    expect(registry.has('risk')).toBe(true);
  });

  it('customers 명령어가 등록되어 있다', () => {
    const registry = new CommandRegistry();
    expect(registry.has('customers')).toBe(true);
  });

  it('partners 명령어가 등록되어 있다', () => {
    const registry = new CommandRegistry();
    expect(registry.has('partners')).toBe(true);
  });

  it('workflows 명령어가 등록되어 있다', () => {
    const registry = new CommandRegistry();
    expect(registry.has('workflows')).toBe(true);
  });

  it('get으로 명령어를 조회할 수 있다', () => {
    const registry = new CommandRegistry();
    const cmd = registry.get('analyze');
    expect(cmd).toBeDefined();
    expect(cmd?.name).toBe('Analyze');
  });

  it('존재하지 않는 명령어는 undefined를 반환한다', () => {
    const registry = new CommandRegistry();
    expect(registry.get('nonexistent')).toBeUndefined();
  });

  it('register로 새 명령어를 등록할 수 있다', () => {
    const registry = new CommandRegistry();
    registry.register({
      id: 'custom',
      name: 'Custom',
      description: '커스텀 명령어',
      endpoint: '/api/custom',
    });
    expect(registry.has('custom')).toBe(true);
    expect(registry.list()).toHaveLength(7);
  });

  it('register로 기존 명령어를 덮어쓸 수 있다', () => {
    const registry = new CommandRegistry();
    registry.register({
      id: 'analyze',
      name: 'Custom Analyze',
      description: '커스텀 분석',
      endpoint: '/api/analyze',
    });
    expect(registry.get('analyze')?.name).toBe('Custom Analyze');
  });

  it('listCommands: flag=false이면 로컬 명령어 목록을 반환한다', async () => {
    const registry = new CommandRegistry();
    const result = await registry.listCommands();
    expect(result.status).toBe(200);
    const body = await result.json();
    expect(body.commands).toHaveLength(6);
  });

  it('executeCommand: flag=false이면 로컬 핸들러를 실행한다', async () => {
    const registry = new CommandRegistry();
    const result = await registry.executeCommand({
      command: 'analyze',
    });
    expect(result.status).toBe(200);
    const body = await result.json();
    expect(body.status).toBe('queued');
  });

  it('executeCommand: 등록된 핸들러가 있으면 실행한다', async () => {
    const registry = new CommandRegistry();
    const handler = vi.fn().mockResolvedValue({ result: 'ok' });
    registry.register({
      id: 'custom',
      name: 'Custom',
      description: 'desc',
      endpoint: '/api/custom',
      handler,
    });

    const result = await registry.executeCommand({ command: 'custom' });
    const body = await result.json();
    expect(body.status).toBe('completed');
    expect(handler).toHaveBeenCalled();
  });

  it('executeCommand: 핸들러 에러 시 500을 반환한다', async () => {
    const registry = new CommandRegistry();
    const handler = vi.fn().mockRejectedValue(new Error('handler error'));
    registry.register({
      id: 'failing',
      name: 'Failing',
      description: 'desc',
      endpoint: '/api/failing',
      handler,
    });

    const result = await registry.executeCommand({ command: 'failing' });
    expect(result.status).toBe(500);
  });

  it('executeCommand: 존재하지 않는 명령어는 404를 반환한다', async () => {
    const registry = new CommandRegistry();
    const result = await registry.executeCommand({ command: 'nonexistent' });
    expect(result.status).toBe(404);
  });

  it('executeCommand: actionContext를 전달할 수 있다', async () => {
    const registry = new CommandRegistry();
    const ctx = { userId: 'u1', sessionId: 's1' };
    const result = await registry.executeCommand({ command: 'analyze' }, ctx);
    expect(result.status).toBe(200);
  });
});
