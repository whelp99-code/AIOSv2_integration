/**
 * JSON file-backed MailRepository for local dev and bridge caching.
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { AnalyzedMail } from '@aios/domain-mail';
import type { MailRepository } from '@aios/domain-mail';

type MailStore = {
  mails: AnalyzedMail[];
  updatedAt?: string;
};

export class JsonMailRepository implements MailRepository {
  constructor(private filePath: string) {}

  private async loadStore(): Promise<MailStore> {
    try {
      const raw = await readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(raw) as MailStore;
      return { mails: parsed.mails ?? [], updatedAt: parsed.updatedAt };
    } catch {
      return { mails: [] };
    }
  }

  private async saveStore(mails: AnalyzedMail[]) {
    await mkdir(dirname(this.filePath), { recursive: true });
    const payload: MailStore = {
      mails,
      updatedAt: new Date().toISOString(),
    };
    await writeFile(this.filePath, JSON.stringify(payload, null, 2), 'utf8');
  }

  async findById(id: string): Promise<AnalyzedMail | null> {
    const store = await this.loadStore();
    return store.mails.find((mail) => mail.id === id) ?? null;
  }

  async findAll(options?: { limit?: number; offset?: number }): Promise<AnalyzedMail[]> {
    const store = await this.loadStore();
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? store.mails.length;
    return store.mails.slice(offset, offset + limit);
  }

  async findByGroupKey(groupKey: string): Promise<AnalyzedMail[]> {
    const store = await this.loadStore();
    return store.mails.filter((mail) => mail.groupKey === groupKey);
  }

  async save(mail: AnalyzedMail): Promise<void> {
    const store = await this.loadStore();
    const index = store.mails.findIndex((entry) => entry.id === mail.id);
    if (index >= 0) {
      store.mails[index] = mail;
    } else {
      store.mails.unshift(mail);
    }
    await this.saveStore(store.mails);
  }

  async update(id: string, updates: Partial<AnalyzedMail>): Promise<void> {
    const store = await this.loadStore();
    const index = store.mails.findIndex((entry) => entry.id === id);
    if (index < 0) return;
    store.mails[index] = { ...store.mails[index], ...updates, id };
    await this.saveStore(store.mails);
  }

  async delete(id: string): Promise<void> {
    const store = await this.loadStore();
    await this.saveStore(store.mails.filter((mail) => mail.id !== id));
  }

  async count(): Promise<number> {
    const store = await this.loadStore();
    return store.mails.length;
  }

  async replaceAll(mails: AnalyzedMail[]): Promise<void> {
    await this.saveStore(mails);
  }
}

export function createJsonMailRepository(filePath?: string) {
  const resolved =
    filePath ||
    process.env.MAIL_JSON_REPO_PATH ||
    `${process.cwd()}/data/mail-repository.json`;
  return new JsonMailRepository(resolved);
}
