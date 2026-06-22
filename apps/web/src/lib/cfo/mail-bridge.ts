const CFO_URL = process.env.CFO_AIOS_URL ?? 'http://localhost:4100';

export type MailCfoClassification = 'invoice' | 'payment' | 'tax' | 'other';

export function classifyMailForCfo(input: {
  subject?: string;
  bodyPreview?: string;
}): MailCfoClassification {
  const text = `${input.subject ?? ''} ${input.bodyPreview ?? ''}`.toLowerCase();
  if (/invoice|청구|세금계산/.test(text)) return 'invoice';
  if (/payment|입금|송금/.test(text)) return 'payment';
  if (/tax|부가세|원천징수/.test(text)) return 'tax';
  return 'other';
}

export async function createCfoDraftFromMail(input: {
  subject: string;
  bodyPreview?: string;
  from?: string;
}) {
  const kind = classifyMailForCfo(input);
  if (kind === 'other') {
    return { created: false, reason: 'not-financial' };
  }

  try {
    const res = await fetch(`${CFO_URL}/api/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: 'draft',
        description: input.subject,
        metadata: { source: 'mail', from: input.from, kind },
        readOnlyUntilApproval: true,
      }),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      return { created: false, reason: `cfo-${res.status}` };
    }

    const draft = await res.json();
    return { created: true, kind, draft };
  } catch {
    return { created: false, reason: 'cfo-unavailable' };
  }
}
