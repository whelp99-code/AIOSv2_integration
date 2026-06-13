import { NextResponse } from 'next/server';

export async function GET() {
  const hasWebhook = Boolean(process.env.SLACK_WEBHOOK_URL);
  const hasBotToken = Boolean(process.env.SLACK_BOT_TOKEN);
  const connected = hasWebhook || hasBotToken;

  return NextResponse.json({
    connected,
    hasWebhook,
    hasBotToken,
    status: connected ? 'ok' : 'unreachable',
  });
}
