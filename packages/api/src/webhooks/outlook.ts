/**
 * Outlook Webhook 엔드포인트
 * 
 * Microsoft Graph API에서 메일 수신 시 webhook notification을 처리한다.
 */

import { type MailItem } from '@aios/persona';

// 웹훅 알림 데이터
export interface WebhookNotification {
  value: Array<{
    subscriptionId: string;
    changeType: string;
    resource: string;
    resourceData: {
      id: string;
      '@odata.type': string;
      '@odata.id': string;
    };
    clientState: string;
    subscriptionExpirationDateTime: string;
  }>;
}

// Graph API 메일 응답
export interface GraphMailMessage {
  id: string;
  subject: string;
  from: {
    emailAddress: {
      address: string;
      name: string;
    };
  };
  toRecipients: Array<{
    emailAddress: {
      address: string;
      name: string;
    };
  }>;
  body: {
    content: string;
    contentType: string;
  };
  receivedDateTime: string;
  importance: string;
  isRead: boolean;
}

/**
 * Outlook Webhook 핸들러
 */
export class OutlookWebhookHandler {
  private clientState: string;
  private mailProcessor: (mail: MailItem) => Promise<void>;
  private mailFetcher?: (mailId: string) => Promise<MailItem>;

  constructor(
    clientState: string,
    mailProcessor: (mail: MailItem) => Promise<void>,
    mailFetcher?: (mailId: string) => Promise<MailItem>,
  ) {
    this.clientState = clientState;
    this.mailProcessor = mailProcessor;
    this.mailFetcher = mailFetcher;
  }

  /**
   * 웹훅 검증 요청 처리 (GET)
   * Azure AD가 웹훅 URL을 검증할 때 호출
   */
  handleValidation(query: Record<string, string>): { status: number; body: string } {
    const validationToken = query.validationToken;
    
    if (validationToken) {
      console.log('[OutlookWebhook] Validation request received');
      return {
        status: 200,
        body: validationToken,
      };
    }

    return { status: 400, body: 'Missing validationToken' };
  }

  /**
   * 웹훅 알림 처리 (POST)
   */
  async handleNotification(notification: WebhookNotification): Promise<{ status: number; body: string }> {
    console.log(`[OutlookWebhook] Received ${notification.value.length} notifications`);

    for (const event of notification.value) {
      // clientState 검증
      if (event.clientState !== this.clientState) {
        console.warn('[OutlookWebhook] Invalid clientState, skipping');
        continue;
      }

      // 메일 수신 이벤트 처리
      if (event.changeType === 'created') {
        try {
          await this.processMailEvent(event.resourceData.id);
        } catch (error) {
          console.error(`[OutlookWebhook] Error processing mail ${event.resourceData.id}:`, error);
        }
      }
    }

    return { status: 202, body: 'Accepted' };
  }

  /**
   * 메일 이벤트 처리
   */
  private async processMailEvent(mailId: string): Promise<void> {
    console.log(`[OutlookWebhook] Processing mail: ${mailId}`);

    const mailItem: MailItem = this.mailFetcher
      ? await this.mailFetcher(mailId)
      : {
          id: mailId,
          subject: '',
          from: '',
          to: [],
          body: '',
          receivedAt: new Date().toISOString(),
        };

    await this.mailProcessor(mailItem);
  }

  /**
   * Graph API 메일 → MailItem 변환
   */
  static convertGraphMailToMailItem(graphMail: GraphMailMessage): MailItem {
    return {
      id: graphMail.id,
      subject: graphMail.subject,
      from: graphMail.from.emailAddress.address,
      to: graphMail.toRecipients.map(r => r.emailAddress.address),
      body: this.stripHtml(graphMail.body.content),
      receivedAt: graphMail.receivedDateTime,
    };
  }

  /**
   * HTML 태그 제거
   */
  private static stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }
}

/**
 * 웹훅 라우터 (Express/Hono 등에서 사용)
 */
export function createWebhookRoutes(handler: OutlookWebhookHandler) {
  return {
    /**
     * GET /webhooks/outlook - 검증 요청
     */
    validation: (req: { query: Record<string, string> }) => {
      return handler.handleValidation(req.query);
    },

    /**
     * POST /webhooks/outlook - 알림 처리
     */
    notification: async (req: { body: WebhookNotification }) => {
      return handler.handleNotification(req.body);
    },
  };
}
