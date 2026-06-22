import { NextResponse } from 'next/server';
import { ingestBronze, loadRegistry } from '@aios/data-plane';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const registry = await loadRegistry();
    const result = await ingestBronze(
      'device',
      {
        serialNumber: body.serialNumber ?? body.serial ?? `SN-${Date.now()}`,
        model: body.model ?? 'NGAF',
        ip: body.ip,
        status: body.status ?? 'online',
        capturedAt: new Date().toISOString(),
      },
      registry,
    );

    return NextResponse.json({
      ok: true,
      layer: 'bronze',
      entity: 'device',
      record: result.record,
      streamId: result.streamId,
      sampleReport: {
        format: 'docx',
        title: 'Sangfor 점검 샘플 보고서',
        generatedAt: new Date().toISOString(),
        deviceId: result.id,
      },
    });
  } catch (error) {
    console.error('device ingest error:', error);
    return NextResponse.json({ error: 'device bronze ingest failed' }, { status: 500 });
  }
}
