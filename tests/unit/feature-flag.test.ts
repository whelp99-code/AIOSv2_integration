import { afterEach, describe, expect, it, vi } from 'vitest';

let isRealLogicEnabled: typeof import('@/lib/services/feature-flag').isRealLogicEnabled;
let withFeatureFlag: typeof import('@/lib/services/feature-flag').withFeatureFlag;

async function loadModule() {
  vi.resetModules();
  const mod = await import('@/lib/services/feature-flag');
  isRealLogicEnabled = mod.isRealLogicEnabled;
  withFeatureFlag = mod.withFeatureFlag;
}

afterEach(() => {
  delete process.env.NEXT_PUBLIC_AIOS_V1_REAL_LOGIC;
  vi.resetModules();
});

describe('feature-flag', () => {
  it('환경변수가 없으면 false를 반환한다', async () => {
    await loadModule();
    expect(isRealLogicEnabled()).toBe(false);
  });

  it('값이 "true"이면 true를 반환한다', async () => {
    process.env.NEXT_PUBLIC_AIOS_V1_REAL_LOGIC = 'true';
    await loadModule();
    expect(isRealLogicEnabled()).toBe(true);
  });

  it('값이 "1"이면 true를 반환한다', async () => {
    process.env.NEXT_PUBLIC_AIOS_V1_REAL_LOGIC = '1';
    await loadModule();
    expect(isRealLogicEnabled()).toBe(true);
  });

  it('값이 "false"이면 false를 반환한다', async () => {
    process.env.NEXT_PUBLIC_AIOS_V1_REAL_LOGIC = 'false';
    await loadModule();
    expect(isRealLogicEnabled()).toBe(false);
  });

  it('값이 "0"이면 false를 반환한다', async () => {
    process.env.NEXT_PUBLIC_AIOS_V1_REAL_LOGIC = '0';
    await loadModule();
    expect(isRealLogicEnabled()).toBe(false);
  });

  it('값이 빈 문자열이면 false를 반환한다', async () => {
    process.env.NEXT_PUBLIC_AIOS_V1_REAL_LOGIC = '';
    await loadModule();
    expect(isRealLogicEnabled()).toBe(false);
  });

  it('withFeatureFlag: flag=false이면 fallback을 실행한다', async () => {
    await loadModule();
    const result = withFeatureFlag(() => 'real', () => 'fallback');
    expect(result).toBe('fallback');
  });

  it('withFeatureFlag: flag=true이면 realFn을 실행한다', async () => {
    process.env.NEXT_PUBLIC_AIOS_V1_REAL_LOGIC = 'true';
    await loadModule();
    const result = withFeatureFlag(() => 'real', () => 'fallback');
    expect(result).toBe('real');
  });

  it('withFeatureFlag: 비동기 함수를 지원한다', async () => {
    await loadModule();
    const result = await withFeatureFlag(
      async () => 'real',
      async () => 'fallback',
    );
    expect(result).toBe('fallback');
  });

  it('withFeatureFlag: 비동기 + flag=true', async () => {
    process.env.NEXT_PUBLIC_AIOS_V1_REAL_LOGIC = 'true';
    await loadModule();
    const result = await withFeatureFlag(
      async () => 'real',
      async () => 'fallback',
    );
    expect(result).toBe('real');
  });
});
