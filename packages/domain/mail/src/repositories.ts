/**
 * Mail Repository Interfaces
 * 메일 레포지토리 인터페이스
 */

import type { MailMessage, AnalyzedMail } from './entities';

export interface MailRepository {
  findById(id: string): Promise<AnalyzedMail | null>;
  findAll(options?: { limit?: number; offset?: number }): Promise<AnalyzedMail[]>;
  findByGroupKey(groupKey: string): Promise<AnalyzedMail[]>;
  save(mail: AnalyzedMail): Promise<void>;
  update(id: string, updates: Partial<AnalyzedMail>): Promise<void>;
  delete(id: string): Promise<void>;
  count(): Promise<number>;
}

export interface MailAnalysisRepository {
  findByMailId(mailId: string): Promise<AnalyzedMail | null>;
  saveAnalysis(mailId: string, analysis: AnalyzedMail['aiAnalysis']): Promise<void>;
  findByCategory(category: string, limit?: number): Promise<AnalyzedMail[]>;
  findByPriority(priority: string, limit?: number): Promise<AnalyzedMail[]>;
}
