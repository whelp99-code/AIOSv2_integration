import { describe, expect, it, afterEach } from 'vitest';
import { ProcessSandbox } from '../../packages/infrastructure/sandbox/src/process-sandbox';

describe('ProcessSandbox', () => {
  let sandbox: ProcessSandbox;

  afterEach(async () => {
    if (sandbox) {
      await sandbox.cleanup();
    }
  });

  it('should execute a simple command', async () => {
    sandbox = new ProcessSandbox({ timeout: 5000 });
    const result = await sandbox.execute('echo', ['hello']);

    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe('hello');
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });

  it('should capture stderr', async () => {
    sandbox = new ProcessSandbox({ timeout: 5000 });
    const result = await sandbox.execute('node', ['-e', 'process.stderr.write("err msg")']);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain('err msg');
  });

  it('should handle command failure', async () => {
    sandbox = new ProcessSandbox({ timeout: 5000 });
    const result = await sandbox.execute('node', ['-e', 'process.exit(1)']);

    expect(result.exitCode).not.toBe(0);
  });

  it('should handle timeout', async () => {
    sandbox = new ProcessSandbox({ timeout: 500 });
    const result = await sandbox.execute('node', ['-e', 'setTimeout(() => {}, 5000)']);

    expect(result.exitCode).not.toBe(0);
  });

  it('should write and read files in temp directory', async () => {
    sandbox = new ProcessSandbox({ timeout: 5000 });
    await sandbox.writeFile('test.txt', 'hello sandbox');

    const content = await sandbox.readFile('test.txt');
    expect(content).toBe('hello sandbox');
  });

  it('should write to nested paths', async () => {
    sandbox = new ProcessSandbox({ timeout: 5000 });
    await sandbox.writeFile('deep/nested/file.txt', 'nested content');

    const content = await sandbox.readFile('deep/nested/file.txt');
    expect(content).toBe('nested content');
  });

  it('should cleanup temp directory', async () => {
    sandbox = new ProcessSandbox({ timeout: 5000 });
    await sandbox.writeFile('temp.txt', 'will be deleted');
    const tempDir = sandbox.getTempDir();
    expect(tempDir).not.toBeNull();

    await sandbox.cleanup();
    expect(sandbox.getTempDir()).toBeNull();
  });
});
