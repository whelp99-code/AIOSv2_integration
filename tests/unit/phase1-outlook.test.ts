import { describe, it, expect } from 'vitest';

/**
 * Phase 1 테스트: Outlook API 연동 + 메일 자동 분류
 */

// MailClassifier 시뮬레이션
interface MailItem {
  id: string;
  subject: string;
  from: string;
  to: string[];
  body: string;
  receivedAt: string;
}

type PersonaType = 'WORK_SUPPORT' | 'SALES' | 'PRESALES' | 'ENGINEER' | 'PM' | 'FINANCE' | 'MARKETING' | 'CEO';

function classifyMail(mail: MailItem): { category: PersonaType; confidence: number; matchedRules: string[] } {
  const text = `${mail.subject} ${mail.body}`.toLowerCase();
  const matchedRules: string[] = [];
  let category: PersonaType = 'WORK_SUPPORT';
  let confidence = 0.5;

  if (['견적', 'quote', '제안', 'proposal'].some(kw => text.includes(kw))) {
    matchedRules.push('sales-keywords');
    category = 'SALES';
    confidence = 0.8;
  }
  if (['청구서', 'invoice', '비용', 'expense'].some(kw => text.includes(kw))) {
    matchedRules.push('finance-keywords');
    category = 'FINANCE';
    confidence = 0.85;
  }
  if (['기술', 'technical', '문의', 'inquiry'].some(kw => text.includes(kw))) {
    matchedRules.push('presales-tech');
    category = 'PRESALES';
    confidence = 0.75;
  }
  if (['승인', 'approval', '긴급', 'urgent'].some(kw => text.includes(kw))) {
    matchedRules.push('ceo-approval');
    category = 'CEO';
    confidence = 0.9;
  }

  if (matchedRules.length === 0) matchedRules.push('default');
  return { category, confidence, matchedRules };
}

// Graph API 메일 인터페이스
interface GraphMailMessage {
  id: string;
  subject: string;
  from: { emailAddress: { address: string; name: string } };
  toRecipients: Array<{ emailAddress: { address: string; name: string } }>;
  body: { content: string; contentType: string };
  receivedDateTime: string;
  importance: string;
  isRead: boolean;
}

// Graph Mail → MailItem 변환
function convertGraphMailToMailItem(graphMail: GraphMailMessage): MailItem {
  return {
    id: graphMail.id,
    subject: graphMail.subject,
    from: graphMail.from.emailAddress.address,
    to: graphMail.toRecipients.map(r => r.emailAddress.address),
    body: graphMail.body.content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(),
    receivedAt: graphMail.receivedDateTime,
  };
}

// 웹훅 검증 시뮬레이션
function handleValidation(query: Record<string, string>): { status: number; body: string } {
  const validationToken = query.validationToken;
  if (validationToken) {
    return { status: 200, body: validationToken };
  }
  return { status: 400, body: 'Missing validationToken' };
}

// 웹훅 알림 시뮬레이션
interface WebhookNotification {
  value: Array<{
    subscriptionId: string;
    changeType: string;
    resource: string;
    resourceData: { id: string };
    clientState: string;
  }>;
}

function handleNotification(notification: WebhookNotification, expectedClientState: string): { status: number; processed: string[] } {
  const processed: string[] = [];

  for (const event of notification.value) {
    if (event.clientState !== expectedClientState) continue;
    if (event.changeType === 'created') {
      processed.push(event.resourceData.id);
    }
  }

  return { status: 202, processed };
}

// OAuth URL 생성 시뮬레이션
function getAuthorizationUrl(clientId: string, tenantId: string, redirectUri: string, scopes: string[], state: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: scopes.join(' '),
    state,
    response_mode: 'query',
  });
  return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
}

// 웹훅 구독 생성 시뮬레이션
function createMailSubscription(notificationUrl: string): { id: string; expirationDateTime: string; resource: string } {
  const expiration = new Date();
  expiration.setDate(expiration.getDate() + 3);
  return {
    id: `sub-${Date.now()}`,
    expirationDateTime: expiration.toISOString(),
    resource: '/me/messages',
  };
}

describe('Phase 1 - Outlook API Integration', () => {
  describe('Graph API OAuth', () => {
    it('should generate authorization URL', () => {
      const url = getAuthorizationUrl(
        'client-id-123',
        'tenant-id-456',
        'https://example.com/callback',
        ['Mail.Read', 'Mail.ReadWrite'],
        'state-789',
      );

      expect(url).toContain('login.microsoftonline.com');
      expect(url).toContain('client_id=client-id-123');
      expect(url).toContain('tenant-id-456');
      expect(url).toContain('Mail.Read');
      expect(url).toContain('state=state-789');
    });

    it('should create mail subscription', () => {
      const subscription = createMailSubscription('https://example.com/webhook');

      expect(subscription.id).toContain('sub-');
      expect(subscription.resource).toBe('/me/messages');

      // 3일 후 만료 확인
      const expiration = new Date(subscription.expirationDateTime);
      const expected = new Date();
      expected.setDate(expected.getDate() + 3);
      expect(expiration.getDate()).toBe(expected.getDate());
    });
  });

  describe('Outlook Webhook', () => {
    it('should handle validation request', () => {
      const result = handleValidation({ validationToken: 'test-token-123' });

      expect(result.status).toBe(200);
      expect(result.body).toBe('test-token-123');
    });

    it('should reject validation without token', () => {
      const result = handleValidation({});

      expect(result.status).toBe(400);
      expect(result.body).toBe('Missing validationToken');
    });

    it('should process mail notification', () => {
      const notification: WebhookNotification = {
        value: [
          {
            subscriptionId: 'sub-123',
            changeType: 'created',
            resource: '/me/messages/mail-001',
            resourceData: { id: 'mail-001' },
            clientState: 'aios-webhook',
          },
        ],
      };

      const result = handleNotification(notification, 'aios-webhook');

      expect(result.status).toBe(202);
      expect(result.processed).toContain('mail-001');
    });

    it('should reject notification with wrong clientState', () => {
      const notification: WebhookNotification = {
        value: [
          {
            subscriptionId: 'sub-123',
            changeType: 'created',
            resource: '/me/messages/mail-001',
            resourceData: { id: 'mail-001' },
            clientState: 'wrong-state',
          },
        ],
      };

      const result = handleNotification(notification, 'aios-webhook');

      expect(result.status).toBe(202);
      expect(result.processed.length).toBe(0);
    });
  });

  describe('Mail Adapter', () => {
    it('should convert Graph mail to MailItem', () => {
      const graphMail: GraphMailMessage = {
        id: 'mail-001',
        subject: '견적 요청 드립니다',
        from: { emailAddress: { address: 'customer@customer.com', name: '김철수' } },
        toRecipients: [{ emailAddress: { address: 'ceo@company.com', name: 'CEO' } }],
        body: { content: '<p>견적 요청합니다.</p>', contentType: 'html' },
        receivedDateTime: '2026-06-23T12:00:00Z',
        importance: 'normal',
        isRead: false,
      };

      const mailItem = convertGraphMailToMailItem(graphMail);

      expect(mailItem.id).toBe('mail-001');
      expect(mailItem.subject).toBe('견적 요청 드립니다');
      expect(mailItem.from).toBe('customer@customer.com');
      expect(mailItem.to).toContain('ceo@company.com');
      expect(mailItem.body).not.toContain('<p>');
      expect(mailItem.body).toContain('견적 요청합니다.');
    });

    it('should strip HTML tags from body', () => {
      const graphMail: GraphMailMessage = {
        id: 'mail-002',
        subject: '테스트',
        from: { emailAddress: { address: 'test@test.com', name: '테스트' } },
        toRecipients: [{ emailAddress: { address: 'ceo@company.com', name: 'CEO' } }],
        body: { content: '<div><strong>중요</strong> 내용입니다.</div>', contentType: 'html' },
        receivedDateTime: '2026-06-23T12:00:00Z',
        importance: 'high',
        isRead: false,
      };

      const mailItem = convertGraphMailToMailItem(graphMail);

      expect(mailItem.body).not.toContain('<div>');
      expect(mailItem.body).not.toContain('<strong>');
      expect(mailItem.body).toContain('중요');
      expect(mailItem.body).toContain('내용입니다.');
    });
  });

  describe('Mail Classification', () => {
    it('should classify sales mail', () => {
      const mail: MailItem = {
        id: 'mail-001',
        subject: '견적 요청 드립니다',
        from: 'customer@customer.com',
        to: ['ceo@company.com'],
        body: '견적 요청합니다.',
        receivedAt: new Date().toISOString(),
      };

      const result = classifyMail(mail);

      expect(result.category).toBe('SALES');
      expect(result.confidence).toBe(0.8);
      expect(result.matchedRules).toContain('sales-keywords');
    });

    it('should classify finance mail', () => {
      const mail: MailItem = {
        id: 'mail-002',
        subject: '청구서 발송 건',
        from: 'finance@company.com',
        to: ['ceo@company.com'],
        body: '청구서 발송합니다.',
        receivedAt: new Date().toISOString(),
      };

      const result = classifyMail(mail);

      expect(result.category).toBe('FINANCE');
      expect(result.confidence).toBe(0.85);
      expect(result.matchedRules).toContain('finance-keywords');
    });

    it('should classify presales mail', () => {
      const mail: MailItem = {
        id: 'mail-003',
        subject: '기술 문의 드립니다',
        from: 'tech@customer.com',
        to: ['presales@company.com'],
        body: '기술 사양 문의드립니다.',
        receivedAt: new Date().toISOString(),
      };

      const result = classifyMail(mail);

      expect(result.category).toBe('PRESALES');
      expect(result.confidence).toBe(0.75);
      expect(result.matchedRules).toContain('presales-tech');
    });

    it('should classify CEO approval mail', () => {
      const mail: MailItem = {
        id: 'mail-004',
        subject: '긴급 승인 요청',
        from: 'manager@company.com',
        to: ['ceo@company.com'],
        body: '500만원 계약 승인 요청합니다.',
        receivedAt: new Date().toISOString(),
      };

      const result = classifyMail(mail);

      expect(result.category).toBe('CEO');
      expect(result.confidence).toBe(0.9);
      expect(result.matchedRules).toContain('ceo-approval');
    });

    it('should classify unknown mail as WORK_SUPPORT', () => {
      const mail: MailItem = {
        id: 'mail-005',
        subject: 'Hello',
        from: 'someone@example.com',
        to: ['info@company.com'],
        body: 'Just a greeting.',
        receivedAt: new Date().toISOString(),
      };

      const result = classifyMail(mail);

      expect(result.category).toBe('WORK_SUPPORT');
      expect(result.confidence).toBe(0.5);
      expect(result.matchedRules).toContain('default');
    });
  });

  describe('Full Pipeline', () => {
    it('should process sales mail through full pipeline', () => {
      // 1. Graph mail 수신
      const graphMail: GraphMailMessage = {
        id: 'mail-001',
        subject: '견적 요청 드립니다',
        from: { emailAddress: { address: 'customer@customer.com', name: '김철수' } },
        toRecipients: [{ emailAddress: { address: 'ceo@company.com', name: 'CEO' } }],
        body: { content: '견적 요청합니다.', contentType: 'text' },
        receivedDateTime: new Date().toISOString(),
        importance: 'normal',
        isRead: false,
      };

      // 2. MailItem으로 변환
      const mailItem = convertGraphMailToMailItem(graphMail);

      // 3. 분류
      const classification = classifyMail(mailItem);

      // 4. 검증
      expect(classification.category).toBe('SALES');
      expect(classification.confidence).toBe(0.8);
      expect(mailItem.from).toBe('customer@customer.com');
    });

    it('should process CEO approval mail through full pipeline', () => {
      const graphMail: GraphMailMessage = {
        id: 'mail-004',
        subject: '긴급 승인 요청',
        from: { emailAddress: { address: 'manager@company.com', name: '매니저' } },
        toRecipients: [{ emailAddress: { address: 'ceo@company.com', name: 'CEO' } }],
        body: { content: '500만원 계약 승인 요청합니다.', contentType: 'text' },
        receivedDateTime: new Date().toISOString(),
        importance: 'high',
        isRead: false,
      };

      const mailItem = convertGraphMailToMailItem(graphMail);
      const classification = classifyMail(mailItem);

      expect(classification.category).toBe('CEO');
      expect(classification.confidence).toBe(0.9);
    });
  });
});
