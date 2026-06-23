/**
 * WorkSupportPersona - 업무지원 페르소나
 * 
 * 메일 분류 → 라우팅 → CEO 브리핑 E2E 플로우를 담당한다.
 */

import { type MailItem, type ClassificationResult, MailClassifier } from '../mail/classifier';
import { PersonaRouter } from '../router/router';

// 업무지원 처리 결과
export interface WorkSupportResult {
  mailId: string;
  classification: ClassificationResult;
  routedTo: string;
  briefingIncluded: boolean;
  timestamp: string;
}

// CEO 브리핑 아이템
export interface BriefingItem {
  mailId: string;
  subject: string;
  category: string;
  confidence: number;
  actionRequired: boolean;
  summary: string;
}

/**
 * 업무지원 페르소나
 */
export class WorkSupportPersona {
  private classifier: MailClassifier;
  private router: PersonaRouter;
  private briefingItems: BriefingItem[] = [];

  constructor(router: PersonaRouter) {
    this.classifier = new MailClassifier();
    this.router = router;
  }

  /**
   * 메일 처리 E2E 플로우
   * 1. 메일 분류 (규칙 기반)
   * 2. 분류 결과에 따라 적절한 페르소나에 라우팅
   * 3. CEO 브리핑에 결과 포함
   */
  async processMail(mail: MailItem): Promise<WorkSupportResult> {
    console.log(`[WorkSupport] Processing mail: ${mail.id} - ${mail.subject}`);

    // 1. 메일 분류
    const classification = this.classifier.classify(mail);
    console.log(`[WorkSupport] Classified as ${classification.category} (confidence: ${classification.confidence})`);

    // 2. 적절한 페르소나에 라우팅
    const messageId = await this.router.route(mail, classification);
    console.log(`[WorkSupport] Routed to ${classification.category} (message: ${messageId})`);

    // 3. CEO 브리핑에 결과 포함
    const briefingItem: BriefingItem = {
      mailId: mail.id,
      subject: mail.subject,
      category: classification.category,
      confidence: classification.confidence,
      actionRequired: classification.category === 'CEO' || classification.confidence < 0.7,
      summary: this.generateBriefingSummary(mail, classification),
    };

    this.briefingItems.push(briefingItem);

    return {
      mailId: mail.id,
      classification,
      routedTo: classification.category,
      briefingIncluded: true,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 브리핑 요약 생성
   */
  private generateBriefingSummary(mail: MailItem, classification: ClassificationResult): string {
    const actionText = classification.category === 'CEO' 
      ? 'CEO 승인 필요' 
      : classification.confidence < 0.7 
        ? '검토 필요' 
        : '자동 처리됨';

    return `[${classification.category}] ${mail.subject} - ${actionText} (신뢰도: ${Math.round(classification.confidence * 100)}%)`;
  }

  /**
   * CEO 브리핑 생성
   */
  generateBriefing(): BriefingItem[] {
    return [...this.briefingItems];
  }

  /**
   * 브리핑 초기화 (일일 리셋)
   */
  clearBriefing(): void {
    this.briefingItems = [];
  }

  /**
   * 라우터에서 메시지 수신 및 처리
   */
  async consumeAndProcess(): Promise<WorkSupportResult[]> {
    const messages = await this.router.consume(10, 5000);
    const results: WorkSupportResult[] = [];

    for (const message of messages) {
      const result: WorkSupportResult = {
        mailId: message.mailId,
        classification: message.classification,
        routedTo: message.targetPersona,
        briefingIncluded: true,
        timestamp: new Date().toISOString(),
      };

      results.push(result);

      await this.router.ack(message.streamMessageId);
    }

    return results;
  }
}
