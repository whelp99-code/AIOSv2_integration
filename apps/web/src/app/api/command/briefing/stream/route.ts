import { buildBriefing } from '@/lib/blro/briefing';

export const dynamic = 'force-dynamic';

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = async () => {
        try {
          const briefing = await buildBriefing();
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(briefing)}\n\n`),
          );
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              `event: error\ndata: ${JSON.stringify({ message: String(error) })}\n\n`,
            ),
          );
        }
      };

      await send();
      const interval = setInterval(send, 15000);
      const cleanup = () => clearInterval(interval);
      // @ts-expect-error cancel hook
      controller.signal?.addEventListener?.('abort', cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
