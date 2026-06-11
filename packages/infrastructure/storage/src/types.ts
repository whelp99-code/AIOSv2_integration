export interface StorageFile {
  id: string;
  name: string;
  path: string;
  size: number;
  mimeType: string;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export interface StorageProvider {
  upload(path: string, content: Buffer, mimeType: string): Promise<StorageFile>;
  download(path: string): Promise<Buffer>;
  delete(path: string): Promise<void>;
  list(prefix?: string): Promise<StorageFile[]>;
  getSignedUrl(path: string, expiresIn?: number): Promise<string>;
}
