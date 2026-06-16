/**
 * Mail Value Objects
 * 메일 값 객체
 */

import { z } from 'zod';

export const WorkflowLaneSchema = z.enum(['urgent', 'active', 'waiting', 'done', 'hold', 'reference']);
export type WorkflowLane = z.infer<typeof WorkflowLaneSchema>;

export const ThreadGroupSchema = z.object({
  key: z.string(),
  label: z.string(),
  count: z.number().int().min(0),
  messageIds: z.array(z.string()),
  userReplied: z.boolean().optional(),
  aiGrouped: z.boolean().optional(),
  participants: z.array(z.string()).optional(),
});
export type ThreadGroup = z.infer<typeof ThreadGroupSchema>;

export const ClassificationFeedbackSchema = z.object({
  messageId: z.string(),
  userStatus: WorkflowLaneSchema,
  reasonCode: z.string().optional(),
  updatedAt: z.string().datetime().optional(),
});
export type ClassificationFeedback = z.infer<typeof ClassificationFeedbackSchema>;

export class EmailAddress {
  constructor(
    public readonly address: string,
    public readonly name?: string
  ) {
    if (!this.isValid()) throw new Error(`Invalid email: ${address}`);
  }

  private isValid(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.address);
  }

  toString(): string {
    return this.name ? `${this.name} <${this.address}>` : this.address;
  }

  equals(other: EmailAddress): boolean {
    return this.address.toLowerCase() === other.address.toLowerCase();
  }
}

export class MailGroupKey {
  constructor(public readonly value: string) {}

  static fromSubject(subject: string): MailGroupKey {
    const normalized = subject
      .replace(/^(re:|fw:|fwd:)\s*/gi, '')
      .trim()
      .toLowerCase();
    return new MailGroupKey(normalized);
  }

  equals(other: MailGroupKey): boolean {
    return this.value === other.value;
  }
}
