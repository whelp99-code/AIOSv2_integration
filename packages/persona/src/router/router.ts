/**
 * PersonaRouter - Redis Stream 기반 페르소나 라우터
 * 
 * Routing Hook 패턴을 사용하여 메일 분류 결과를 적절한 페르소나에 라우팅한다.
 */

import Redis from 'ioredis';
import { type ClassificationResult, type PersonaType, type MailItem } from '../mail/classifier';

// 라우팅 메시지 스키마
export interface RoutingMessage {
  mailId: string;
  mail: MailItem;
  classification: ClassificationResult;
  targetPersona: PersonaType;
  timestamp: string;
  correlationId: string;
}

/** consume() 결과 — Redis Stream 메시지 ID 포함 */
export interface ConsumedRoutingMessage extends RoutingMessage {
  streamMessageId: string;
}

// 라우터 설정
export interface PersonaRouterConfig {
  redisUrl?: string;
  streamName?: string;
  consumerGroup?: string;
  consumerName?: string;
}

/**
 * 페르소나 라우터
 */
export class PersonaRouter {
  private redis: Redis;
  private streamName: string;
  private consumerGroup: string;
  private consumerName: string;

  constructor(config: PersonaRouterConfig = {}) {
    this.redis = new Redis(config.redisUrl || process.env.REDIS_URL || 'redis://127.0.0.1:6382');
    this.streamName = config.streamName || 'aios:persona:routing';
    this.consumerGroup = config.consumerGroup || 'persona-workers';
    this.consumerName = config.consumerName || `worker-${process.pid}`;
  }

  /**
   * Consumer Group 초기화
   */
  async initialize(): Promise<void> {
    try {
      // Consumer Group이 없으면 생성
      await this.redis.xgroup('CREATE', this.streamName, this.consumerGroup, '0', 'MKSTREAM');
    } catch (error: any) {
      // 이미 존재하면 무시
      if (!error.message.includes('BUSYGROUP')) {
        throw error;
      }
    }
  }

  /**
   * 메일을 분류 결과에 따라 적절한 페르소나에 라우팅
   */
  async route(mail: MailItem, classification: ClassificationResult): Promise<string> {
    const message: RoutingMessage = {
      mailId: mail.id,
      mail,
      classification,
      targetPersona: classification.category,
      timestamp: new Date().toISOString(),
      correlationId: `${mail.id}-${Date.now()}`,
    };

    // Redis Stream에 메시지 발행
    const messageId = await this.redis.xadd(
      this.streamName,
      '*', // 자동 ID 생성
      'data', JSON.stringify(message),
      'persona', classification.category,
      'confidence', classification.confidence.toString(),
      'mailId', mail.id,
    );

    console.log(`[PersonaRouter] Routed mail ${mail.id} to ${classification.category} (confidence: ${classification.confidence})`);
    
    return messageId || '';
  }

  /**
   * 메시지 수신 (Consumer Group 사용)
   */
  async consume(count: number = 10, blockMs: number = 5000): Promise<ConsumedRoutingMessage[]> {
    const results = await this.redis.xreadgroup(
      'GROUP', this.consumerGroup, this.consumerName,
      'COUNT', count,
      'BLOCK', blockMs,
      'STREAMS', this.streamName, '>',
    );

    if (!results || results.length === 0) {
      return [];
    }

    const messages: ConsumedRoutingMessage[] = [];
    for (const [, streams] of results as [string, [string, string[]][]][]) {
      for (const [streamMessageId, fields] of streams) {
        const dataIndex = fields.indexOf('data');
        const data = dataIndex >= 0 ? fields[dataIndex + 1] : undefined;
        if (data) {
          try {
            messages.push({
              ...JSON.parse(data) as RoutingMessage,
              streamMessageId,
            });
          } catch (e) {
            console.error('[PersonaRouter] Failed to parse message:', e);
          }
        }
      }
    }

    return messages;
  }

  /**
   * 메시지 ACK
   */
  async ack(messageId: string): Promise<void> {
    await this.redis.xack(this.streamName, this.consumerGroup, messageId);
  }

  /**
   * 연결 종료
   */
  async disconnect(): Promise<void> {
    await this.redis.quit();
  }
}
