/**
 * Local File Storage
 * 로컬 파일 시스템 스토리지 (AIOS v1 재활용)
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type { StorageFile, StorageProvider } from './types';

export class LocalStorageProvider implements StorageProvider {
  private basePath: string;

  constructor(basePath = './uploads') {
    this.basePath = basePath;
  }

  async upload(filePath: string, content: Buffer, mimeType: string): Promise<StorageFile> {
    const fullPath = path.join(this.basePath, filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content);

    return {
      id: `file_${Date.now()}`,
      name: path.basename(filePath),
      path: filePath,
      size: content.length,
      mimeType,
      createdAt: new Date(),
    };
  }

  async download(filePath: string): Promise<Buffer> {
    const fullPath = path.join(this.basePath, filePath);
    return fs.readFile(fullPath);
  }

  async delete(filePath: string): Promise<void> {
    const fullPath = path.join(this.basePath, filePath);
    await fs.unlink(fullPath);
  }

  async list(prefix?: string): Promise<StorageFile[]> {
    try {
      const dir = prefix ? path.join(this.basePath, prefix) : this.basePath;
      const entries = await fs.readdir(dir, { withFileTypes: true });
      return entries
        .filter((e) => e.isFile())
        .map((e) => ({
          id: `file_${e.name}`,
          name: e.name,
          path: prefix ? `${prefix}/${e.name}` : e.name,
          size: 0,
          mimeType: 'application/octet-stream',
          createdAt: new Date(),
        }));
    } catch {
      return [];
    }
  }

  async getSignedUrl(filePath: string, _expiresIn = 3600): Promise<string> {
    return `/uploads/${filePath}`;
  }
}
