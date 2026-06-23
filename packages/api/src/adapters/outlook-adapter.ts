/**
 * Outlook Mail Adapter
 * 
 * Microsoft Graph API 메일을 IngestionItem으로 변환하고
 * MailClassifier → PersonaRouter 파이프라인을 실행한다.
 */

import { type MailItem, MailClassifier, PersonaRouter } from '@aios/persona';
import { OutlookWebhookHandler, type GraphMailMessage } from '../webhooks/outlook';

// IngestionItem 인터페이스
export interface IngestionItem {
  id: string;
  source: 'outlook' | 'gmail';
  sourceId: string;
  rawContent: string;
  mailItem: MailItem;
  classification: {
    category: string;
    confidence: number;
    matchedRules: string[];
  } | null;
  status: 'RECEIVED' | 'CLASSIFIED' | 'ROUTED' | 'PROCESSED';
  createdAt: string;
  updatedAt: string;
}

/**
 * Outlook 어댑터
 */
export class OutlookAdapter {
  private classifier: MailClassifier;
  private router: PersonaRouter;
  private webhookHandler: OutlookWebhookHandler;

  constructor() {
    this.classifier = new MailClassifier();
    this.router = new PersonaRouter();
    this.webhookHandler = new OutlookWebhookHandler(
      process.env.WEBHOOK_CLIENT_STATE || 'aios-webhook',
      this.processMail.bind(this),
    );
  }

  /**
   * 메일 처리 파이프라인
   * 1. Graph API 메일 → MailItem 변환
   * 2. MailClassifier로 분류
   * 3. PersonaRouter로 라우팅
   */
  async processMail(mailItem: MailItem): Promise<IngestionItem> {
    console.log(`[OutlookAdapter] Processing mail: ${mailItem.id}`);

    // 1. IngestionItem 생성
    const ingestionItem: IngestionItem = {
      id: `ing-${Date.now()}`,
      source: 'outlook',
      sourceId: mailItem.id,
      rawContent: JSON.stringify(mailItem),
      mailItem,
      classification: null,
      status: 'RECEIVED',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 2. 분류
    const classification = this.classifier.classify(mailItem);
    ingestionItem.classification = {
      category: classification.category,
      confidence: classification.confidence,
      matchedRules: classification.matchedRules,
    };
    ingestionItem.status = 'CLASSIFIED';
    ingestionItem.updatedAt = new Date().toISOString();

    console.log(`[OutlookAdapter] Classified as ${classification.category} (confidence: ${classification.confidence})`);

    // 3. 라우팅
    await this.router.route(mailItem, classification);
    ingestionItem.status = 'ROUTED';
    ingestionItem.updatedAt = new Date().toISOString();

    console.log(`[OutlookAdapter] Routed to ${classification.category}`);

    return ingestionItem;
  }

  /**
   * Graph API 메일 → IngestionItem 변환
   */
  async processGraphMail(graphMail: GraphMailMessage): Promise<IngestionItem> {
    const mailItem = OutlookWebhookHandler.convertGraphMailToMailItem(graphMail);
    return this.processMail(mailItem);
  }

  /**
   * 웹훅 핸들러 반환
   */
  getWebhookHandler(): OutlookWebhookHandler {
    return this.webhookHandler;
  }

  /**
   * 분류기 반환
   */
  getClassifier(): MailClassifier {
    return this.classifier;
  }

  /**
   * 라우터 반환
   */
  getRouter(): PersonaRouter {
    return this.router;
  }
}

/**
 * Mock 메일 데이터 (테스트용)
 */
export const MOCK_MAILS: GraphMailMessage[] = [
  {
    id: 'mail-001',
    subject: '견적 요청 드립니다',
    from: { emailAddress: { address: 'customer@customer.com', name: '김철수' } },
    toRecipients: [{ emailAddress: { address: 'ceo@company.com', name: 'CEO' } }],
    body: { content: '안녕하세요. 견적 요청합니다.', contentType: 'text' },
    receivedDateTime: new Date().toISOString(),
    importance: 'normal',
    isRead: false,
  },
  {
    id: 'mail-002',
    subject: '청구서 발송 건',
    from: { emailAddress: { address: 'finance@company.com', name: '재무팀' } },
    toRecipients: [{ emailAddress: { address: 'ceo@company.com', name: 'CEO' } }],
    body: { content: '청구서 발송합니다.', contentType: 'text' },
    receivedDateTime: new Date().toISOString(),
    importance: 'normal',
    isRead: false,
  },
  {
    id: 'mail-003',
    subject: '기술 문의 드립니다',
    from: { emailAddress: { address: 'tech@customer.com', name: '이기술' } },
    toRecipients: [{ emailAddress: { address: 'presales@company.com', name: '프리세일즈' } }],
    body: { content: '기술 사양 문의드립니다.', contentType: 'text' },
    receivedDateTime: new Date().toISOString(),
    importance: 'normal',
    isRead: false,
  },
  {
    id: 'mail-004',
    subject: '긴급 승인 요청',
    from: { emailAddress: { address: 'manager@company.com', name: '매니저' } },
    toRecipients: [{ emailAddress: { address: 'ceo@company.com', name: 'CEO' } }],
    body: { content: '500만원 계약 승인 요청합니다.', contentType: 'text' },
    receivedDateTime: new Date().toISOString(),
    importance: 'high',
    isRead: false,
  },
];
