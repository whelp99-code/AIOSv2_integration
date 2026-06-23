/**
 * PII Redactor — Phase 1
 *
 * Standalone PII redaction module for LLM payload sanitization.
 * Used by LLMGateway before constructing external API payloads.
 *
 * Source: packages/persona/src/mail/security-policy.md
 */

// ── Pattern Definitions ────────────────────────────────────────────────

interface PIIPattern {
  name: string;
  pattern: RegExp;
  replacement: string;
  description: string;
}

const PATTERNS: PIIPattern[] = [
  {
    name: 'email',
    pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    replacement: '[EMAIL_REDACTED]',
    description: '이메일 주소',
  },
  {
    name: 'phone-kr',
    pattern: /01[016789]-?\d{3,4}-?\d{4}/g,
    replacement: '[PHONE_REDACTED]',
    description: '한국 휴대폰 번호 (010-xxxx-xxxx)',
  },
  {
    name: 'phone-intl',
    pattern: /\+\d{1,3}[-.\s]?\d{1,4}[-.\s]?\d{3,4}[-.\s]?\d{0,4}/g,
    replacement: '[PHONE_REDACTED]',
    description: '국제 전화번호',
  },
  {
    name: 'account-number',
    pattern: /\b\d{3,4}-?\d{2,6}-?\d{2,6}-?\d{0,3}\b/g,
    replacement: '[ACCOUNT_REDACTED]',
    description: '계좌번호',
  },
  {
    name: 'ssn',
    pattern: /\b\d{6}-?[1-4]\d{6}\b/g,
    replacement: '[ID_REDACTED]',
    description: '주민등록번호',
  },
  {
    name: 'biz-reg',
    pattern: /\b\d{3}-?\d{2}-?\d{5}\b/g,
    replacement: '[ID_REDACTED]',
    description: '사업자등록번호',
  },
  {
    name: 'api-token',
    pattern: /\b(sk-|token[=:]\s*|key[=:]\s*|bearer\s+)[A-Za-z0-9_-]{8,}/gi,
    replacement: '[TOKEN_REDACTED]',
    description: 'API 토큰/키',
  },
  {
    name: 'url-secret',
    pattern: /(?:secret|password|token|key)=[^&\s]+/gi,
    replacement: '[URL_SECRET_REDACTED]',
    description: 'URL 시크릿 파라미터',
  },
];

// ── Redactor ──────────────────────────────────────────────────────────

export interface RedactionResult {
  /** Redacted text */
  text: string;
  /** Total number of PII items redacted */
  count: number;
  /** Types of PII found and redacted */
  types: string[];
  /** Whether any PII was found */
  hadPII: boolean;
}

/**
 * Apply all PII redaction patterns to text.
 * Patterns are applied in order; later patterns operate on already-redacted text.
 */
export function redact(text: string): RedactionResult {
  let redacted = text;
  let totalCount = 0;
  const types: string[] = [];

  for (const { name, pattern, replacement } of PATTERNS) {
    // Reset regex state
    pattern.lastIndex = 0;
    const matches = redacted.match(pattern);
    if (matches && matches.length > 0) {
      totalCount += matches.length;
      types.push(name);
      // Reset again for replace
      pattern.lastIndex = 0;
      redacted = redacted.replace(pattern, replacement);
    }
  }

  return {
    text: redacted,
    count: totalCount,
    types,
    hadPII: totalCount > 0,
  };
}

/**
 * Check if text contains PII without redacting.
 * Returns the list of PII types found.
 */
export function detectPII(text: string): string[] {
  const types: string[] = [];
  for (const { name, pattern } of PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      types.push(name);
    }
  }
  return types;
}

/**
 * Validate that text is safe for external LLM (no T3 data).
 * Returns true if safe, false if PII is detected.
 */
export function isSafeForExternalLLM(text: string): boolean {
  const pii = detectPII(text);
  return pii.length === 0;
}
