import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { LocalStorageProvider } from '../../packages/infrastructure/storage/src/local-storage';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('LocalStorageProvider', () => {
  let storage: LocalStorageProvider;
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'storage-test-'));
    storage = new LocalStorageProvider(tempDir);
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('should upload a file', async () => {
    const content = Buffer.from('Hello, World!');
    const file = await storage.upload('test.txt', content, 'text/plain');

    expect(file.name).toBe('test.txt');
    expect(file.path).toBe('test.txt');
    expect(file.size).toBe(13);
    expect(file.mimeType).toBe('text/plain');
    expect(file.id).toMatch(/^file_/);
    expect(file.createdAt).toBeInstanceOf(Date);

    // Verify file exists on disk
    const onDisk = await fs.readFile(path.join(tempDir, 'test.txt'));
    expect(onDisk.toString()).toBe('Hello, World!');
  });

  it('should upload to nested directories', async () => {
    const content = Buffer.from('nested');
    const file = await storage.upload('deep/nested/file.txt', content, 'text/plain');

    expect(file.name).toBe('file.txt');
    expect(file.path).toBe('deep/nested/file.txt');

    const onDisk = await fs.readFile(path.join(tempDir, 'deep/nested/file.txt'));
    expect(onDisk.toString()).toBe('nested');
  });

  it('should download a file', async () => {
    const content = Buffer.from('download me');
    await storage.upload('dl.txt', content, 'text/plain');

    const downloaded = await storage.download('dl.txt');
    expect(downloaded.toString()).toBe('download me');
  });

  it('should delete a file', async () => {
    await storage.upload('delete-me.txt', Buffer.from('bye'), 'text/plain');
    await storage.delete('delete-me.txt');

    await expect(fs.access(path.join(tempDir, 'delete-me.txt'))).rejects.toThrow();
  });

  it('should list files', async () => {
    await storage.upload('a.txt', Buffer.from('a'), 'text/plain');
    await storage.upload('b.txt', Buffer.from('b'), 'text/plain');

    const files = await storage.list();
    expect(files).toHaveLength(2);
    expect(files.map((f) => f.name).sort()).toEqual(['a.txt', 'b.txt']);
  });

  it('should list files with prefix', async () => {
    await storage.upload('docs/a.txt', Buffer.from('a'), 'text/plain');
    await storage.upload('docs/b.txt', Buffer.from('b'), 'text/plain');
    await storage.upload('other/c.txt', Buffer.from('c'), 'text/plain');

    const files = await storage.list('docs');
    expect(files).toHaveLength(2);
  });

  it('should return empty list for non-existent prefix', async () => {
    const files = await storage.list('nonexistent');
    expect(files).toEqual([]);
  });

  it('should generate signed url', async () => {
    const url = await storage.getSignedUrl('test.txt', 3600);
    expect(url).toBe('/uploads/test.txt');
  });

  it('should overwrite existing file on re-upload', async () => {
    await storage.upload('overwrite.txt', Buffer.from('v1'), 'text/plain');
    await storage.upload('overwrite.txt', Buffer.from('v2'), 'text/plain');

    const downloaded = await storage.download('overwrite.txt');
    expect(downloaded.toString()).toBe('v2');
  });
});
