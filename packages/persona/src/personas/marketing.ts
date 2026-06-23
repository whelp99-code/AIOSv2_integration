/**
 * MarketingPersona - 마케팅 페르소나
 * 
 * 콘텐츠 기획, 뉴스레터 생성, 브랜드 관리를 담당한다.
 */

import { type MailItem, type ClassificationResult } from '../mail/classifier';

// 콘텐츠 기획
export interface ContentPlan {
  id: string;
  title: string;
  type: 'BLOG_POST' | 'NEWSLETTER' | 'SOCIAL_MEDIA' | 'CASE_STUDY' | 'WHITE_PAPER';
  targetAudience: string;
  channels: string[];
  publishDate: string;
  status: 'DRAFT' | 'REVIEW' | 'APPROVED' | 'PUBLISHED';
  createdAt: string;
}

// 뉴스레터
export interface Newsletter {
  id: string;
  subject: string;
  content: NewsletterSection[];
  recipients: string[];
  scheduledAt: string;
  status: 'DRAFT' | 'SCHEDULED' | 'SENT';
  createdAt: string;
}

export interface NewsletterSection {
  title: string;
  content: string;
  order: number;
}

// 브랜드 관리
export interface BrandAsset {
  id: string;
  type: 'LOGO' | 'BANNER' | 'TEMPLATE' | 'GUIDELINE';
  name: string;
  description: string;
  url: string;
  createdAt: string;
}

// 마케팅 처리 결과
export interface MarketingResult {
  mailId: string;
  contentPlan: ContentPlan | null;
  newsletter: Newsletter | null;
  brandAsset: BrandAsset | null;
  action: 'CONTENT_PLANNED' | 'NEWSLETTER_CREATED' | 'BRAND_UPDATED' | 'NO_ACTION';
  timestamp: string;
}

/**
 * 마케팅 페르소나
 */
export class MarketingPersona {
  private contentPlans: Map<string, ContentPlan> = new Map();
  private newsletters: Map<string, Newsletter> = new Map();

  /**
   * 메일 처리
   */
  async processMail(mail: MailItem, classification: ClassificationResult): Promise<MarketingResult> {
    console.log(`[Marketing] Processing mail: ${mail.id} - ${mail.subject}`);

    if (this.isContentMail(mail)) {
      return this.processContentMail(mail);
    } else if (this.isNewsletterMail(mail)) {
      return this.processNewsletterMail(mail);
    } else if (this.isBrandMail(mail)) {
      return this.processBrandMail(mail);
    }

    return {
      mailId: mail.id,
      contentPlan: null,
      newsletter: null,
      brandAsset: null,
      action: 'NO_ACTION',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 콘텐츠 메일 처리
   */
  private async processContentMail(mail: MailItem): Promise<MarketingResult> {
    const plan: ContentPlan = {
      id: `content-${Date.now()}`,
      title: this.extractContentTitle(mail),
      type: this.detectContentType(mail),
      targetAudience: this.detectTargetAudience(mail),
      channels: this.detectChannels(mail),
      publishDate: this.calculatePublishDate(),
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
    };

    this.contentPlans.set(plan.id, plan);
    console.log(`[Marketing] Content planned: ${plan.id} (${plan.type})`);

    return {
      mailId: mail.id,
      contentPlan: plan,
      newsletter: null,
      brandAsset: null,
      action: 'CONTENT_PLANNED',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 뉴스레터 메일 처리
   */
  private async processNewsletterMail(mail: MailItem): Promise<MarketingResult> {
    const newsletter: Newsletter = {
      id: `newsletter-${Date.now()}`,
      subject: mail.subject,
      content: this.generateNewsletterContent(mail),
      recipients: this.extractRecipients(mail),
      scheduledAt: this.calculateScheduleDate(),
      status: 'DRAFT',
      createdAt: new Date().toISOString(),
    };

    this.newsletters.set(newsletter.id, newsletter);
    console.log(`[Marketing] Newsletter created: ${newsletter.id}`);

    return {
      mailId: mail.id,
      contentPlan: null,
      newsletter,
      brandAsset: null,
      action: 'NEWSLETTER_CREATED',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 브랜드 메일 처리
   */
  private async processBrandMail(mail: MailItem): Promise<MarketingResult> {
    const asset: BrandAsset = {
      id: `brand-${Date.now()}`,
      type: this.detectBrandAssetType(mail),
      name: mail.subject,
      description: mail.body,
      url: '',
      createdAt: new Date().toISOString(),
    };

    console.log(`[Marketing] Brand asset updated: ${asset.id} (${asset.type})`);

    return {
      mailId: mail.id,
      contentPlan: null,
      newsletter: null,
      brandAsset: asset,
      action: 'BRAND_UPDATED',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 콘텐츠 메일 여부 확인
   */
  private isContentMail(mail: MailItem): boolean {
    const contentKeywords = ['콘텐츠', 'content', '블로그', 'blog', '기사', 'article', '카피', 'copy'];
    const text = `${mail.subject} ${mail.body}`.toLowerCase();
    return contentKeywords.some(kw => text.includes(kw));
  }

  /**
   * 뉴스레터 메일 여부 확인
   */
  private isNewsletterMail(mail: MailItem): boolean {
    const newsletterKeywords = ['뉴스레터', 'newsletter', '메일링', 'mailing', '구독', 'subscribe'];
    const text = `${mail.subject} ${mail.body}`.toLowerCase();
    return newsletterKeywords.some(kw => text.includes(kw));
  }

  /**
   * 브랜드 메일 여부 확인
   */
  private isBrandMail(mail: MailItem): boolean {
    const brandKeywords = ['브랜드', 'brand', '로고', 'logo', '디자인', 'design', '가이드라인', 'guideline'];
    const text = `${mail.subject} ${mail.body}`.toLowerCase();
    return brandKeywords.some(kw => text.includes(kw));
  }

  /**
   * 콘텐츠 제목 추출
   */
  private extractContentTitle(mail: MailItem): string {
    return mail.subject.substring(0, 100);
  }

  /**
   * 콘텐츠 유형 감지
   */
  private detectContentType(mail: MailItem): ContentPlan['type'] {
    const text = `${mail.subject} ${mail.body}`.toLowerCase();
    if (text.includes('블로그') || text.includes('blog')) return 'BLOG_POST';
    if (text.includes('뉴스레터') || text.includes('newsletter')) return 'NEWSLETTER';
    if (text.includes('소셜') || text.includes('social')) return 'SOCIAL_MEDIA';
    if (text.includes('사례') || text.includes('case study')) return 'CASE_STUDY';
    if (text.includes('백서') || text.includes('white paper')) return 'WHITE_PAPER';
    return 'BLOG_POST';
  }

  /**
   * 타겟 오디언스 감지
   */
  private detectTargetAudience(mail: MailItem): string {
    const text = `${mail.subject} ${mail.body}`.toLowerCase();
    if (text.includes('고객') || text.includes('customer')) return '고객';
    if (text.includes('파트너') || text.includes('partner')) return '파트너';
    if (text.includes('개발자') || text.includes('developer')) return '개발자';
    return '일반';
  }

  /**
   * 채널 감지
   */
  private detectChannels(mail: MailItem): string[] {
    const channels: string[] = [];
    const text = `${mail.subject} ${mail.body}`.toLowerCase();

    if (text.includes('블로그') || text.includes('blog')) channels.push('blog');
    if (text.includes('소셜') || text.includes('social')) channels.push('social');
    if (text.includes('이메일') || text.includes('email')) channels.push('email');
    if (text.includes('유튜브') || text.includes('youtube')) channels.push('youtube');

    return channels.length > 0 ? channels : ['blog'];
  }

  /**
   * 발행일 계산 (7일 후)
   */
  private calculatePublishDate(): string {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date.toISOString();
  }

  /**
   * 뉴스레터 내용 생성
   */
  private generateNewsletterContent(mail: MailItem): NewsletterSection[] {
    return [
      {
        title: '이번 주 소식',
        content: mail.body || '주요 소식을 여기에 입력하세요.',
        order: 1,
      },
      {
        title: '주요 업데이트',
        content: '제품/서비스 업데이트 내용',
        order: 2,
      },
      {
        title: '다가오는 이벤트',
        content: '이벤트 정보',
        order: 3,
      },
    ];
  }

  /**
   * 수신자 추출
   */
  private extractRecipients(mail: MailItem): string[] {
    return mail.to || [];
  }

  /**
   * 스케줄 날짜 계산 (3일 후)
   */
  private calculateScheduleDate(): string {
    const date = new Date();
    date.setDate(date.getDate() + 3);
    return date.toISOString();
  }

  /**
   * 브랜드 에셋 유형 감지
   */
  private detectBrandAssetType(mail: MailItem): BrandAsset['type'] {
    const text = `${mail.subject} ${mail.body}`.toLowerCase();
    if (text.includes('로고') || text.includes('logo')) return 'LOGO';
    if (text.includes('배너') || text.includes('banner')) return 'BANNER';
    if (text.includes('템플릿') || text.includes('template')) return 'TEMPLATE';
    return 'GUIDELINE';
  }

  /**
   * 콘텐츠 기획 목록 조회
   */
  getContentPlans(): ContentPlan[] {
    return Array.from(this.contentPlans.values());
  }

  /**
   * 뉴스레터 목록 조회
   */
  getNewsletters(): Newsletter[] {
    return Array.from(this.newsletters.values());
  }
}
