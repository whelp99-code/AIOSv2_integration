/**
 * Graph API 웹훅 갱신 스케줄러
 * 
 * 3일마다 Graph API 웹훅 구독을 갱신한다.
 * 갱신 실패 시 Telegram 알림을 발송한다.
 */

import { CronJob } from 'cron';

// 웹훅 설정
interface WebhookConfig {
  subscriptionId: string;
  expirationDateTime: string;
  notificationUrl: string;
  resource: string;
  changeType: string;
}

// 갱신 결과
interface RenewalResult {
  success: boolean;
  subscriptionId: string;
  newExpiration: string | null;
  error: string | null;
  timestamp: string;
}

/**
 * 웹훅 갱신 스케줄러
 */
export class WebhookRenewalScheduler {
  private job: CronJob | null = null;
  private config: WebhookConfig;
  private renewalHistory: RenewalResult[] = [];
  private telegramBotToken: string;
  private telegramChatId: string;

  constructor(config: WebhookConfig, telegramBotToken: string, telegramChatId: string) {
    this.config = config;
    this.telegramBotToken = telegramBotToken;
    this.telegramChatId = telegramChatId;
  }

  /**
   * 스케줄러 시작 (3일마다 실행)
   */
  start(): void {
    // 3일마다 자정에 실행
    this.job = new CronJob('0 0 */3 * *', async () => {
      console.log('[WebhookRenewal] Starting renewal...');
      await this.renewSubscription();
    });

    this.job.start();
    console.log('[WebhookRenewal] Scheduler started (every 3 days)');
  }

  /**
   * 스케줄러 중지
   */
  stop(): void {
    if (this.job) {
      this.job.stop();
      this.job = null;
      console.log('[WebhookRenewal] Scheduler stopped');
    }
  }

  /**
   * 웹훅 구독 갱신
   */
  async renewSubscription(): Promise<RenewalResult> {
    const timestamp = new Date().toISOString();

    try {
      // Graph API 호출하여 갱신
      const response = await this.callGraphAPI();

      if (response.success) {
        const result: RenewalResult = {
          success: true,
          subscriptionId: this.config.subscriptionId,
          newExpiration: response.newExpiration,
          error: null,
          timestamp,
        };

        this.renewalHistory.push(result);
        console.log(`[WebhookRenewal] Renewed successfully. New expiration: ${response.newExpiration}`);

        return result;
      } else {
        throw new Error(response.error || 'Unknown error');
      }
    } catch (error) {
      const result: RenewalResult = {
        success: false,
        subscriptionId: this.config.subscriptionId,
        newExpiration: null,
        error: error instanceof Error ? error.message : String(error),
        timestamp,
      };

      this.renewalHistory.push(result);
      console.error(`[WebhookRenewal] Renewal failed: ${result.error}`);

      // Telegram 알림 발송
      await this.sendTelegramAlert(result);

      return result;
    }
  }

  /**
   * Graph API 호출
   */
  private async callGraphAPI(): Promise<{ success: boolean; newExpiration?: string; error?: string }> {
    // 실제 구현에서는 Microsoft Graph API 호출
    // PATCH https://graph.microsoft.com/v1.0/subscriptions/{subscriptionId}
    
    const newExpiration = new Date();
    newExpiration.setDate(newExpiration.getDate() + 3); // 3일 후

    // 시뮬레이션: 실제로는 API 호출
    console.log(`[WebhookRenewal] Calling Graph API to renew subscription ${this.config.subscriptionId}`);

    return {
      success: true,
      newExpiration: newExpiration.toISOString(),
    };
  }

  /**
   * Telegram 알림 발송
   */
  private async sendTelegramAlert(result: RenewalResult): Promise<void> {
    const message = `⚠️ 웹훅 갱신 실패

구독 ID: ${result.subscriptionId}
실패 시간: ${result.timestamp}
오류: ${result.error}

즉시 확인이 필요합니다.`;

    try {
      const url = `https://api.telegram.org/bot${this.telegramBotToken}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.telegramChatId,
          text: message,
          parse_mode: 'HTML',
        }),
      });

      if (!response.ok) {
        console.error(`[WebhookRenewal] Telegram alert failed: ${response.statusText}`);
      } else {
        console.log('[WebhookRenewal] Telegram alert sent');
      }
    } catch (error) {
      console.error(`[WebhookRenewal] Telegram alert error: ${error}`);
    }
  }

  /**
   * 갱신 이력 조회
   */
  getRenewalHistory(): RenewalResult[] {
    return [...this.renewalHistory];
  }

  /**
   * 다음 갱신 시간 조회
   */
  getNextRenewalTime(): Date | null {
    if (!this.job) return null;
    return this.job.nextDate().toJSDate();
  }

  /**
   * 현재 설정 조회
   */
  getConfig(): WebhookConfig {
    return { ...this.config };
  }
}

/**
 * 웹훅 갱신 스케줄러 팩토리
 */
export function createWebhookRenewalScheduler(
  subscriptionId: string,
  notificationUrl: string,
  telegramBotToken: string,
  telegramChatId: string,
): WebhookRenewalScheduler {
  const config: WebhookConfig = {
    subscriptionId,
    expirationDateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3일 후
    notificationUrl,
    resource: '/me/messages',
    changeType: 'created',
  };

  return new WebhookRenewalScheduler(config, telegramBotToken, telegramChatId);
}
