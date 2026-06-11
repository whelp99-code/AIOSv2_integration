/**
 * Mail Domain Events
 * 메일 도메인 이벤트
 */

export interface MailReceivedEvent {
  type: 'mail.received';
  mailId: string;
  from: string;
  subject: string;
  timestamp: Date;
}

export interface MailAnalyzedEvent {
  type: 'mail.analyzed';
  mailId: string;
  analysis: {
    category: string;
    priority: string;
    sentiment: string;
  };
  timestamp: Date;
}

export interface MailArchivedEvent {
  type: 'mail.archived';
  mailId: string;
  reason: string;
  timestamp: Date;
}

export type MailEvent = MailReceivedEvent | MailAnalyzedEvent | MailArchivedEvent;

export type MailEventHandler = (event: MailEvent) => void | Promise<void>;
