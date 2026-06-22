import { randomUUID } from 'node:crypto';

import { publishEvent } from '../publisher';
import { getLayerSchema, type SchemaRegistry } from '../registry';

export type BronzeIngestResult = {
  id: string;
  streamId: string;
  record: Record<string, unknown>;
};

export async function ingestBronze(
  entity: string,
  rawPayload: unknown,
  registry: SchemaRegistry,
): Promise<BronzeIngestResult> {
  getLayerSchema(registry, entity, 'bronze');

  const id = randomUUID();
  const record: Record<string, unknown> = {
    id,
    rawPayload,
    ingestedAt: new Date().toISOString(),
  };

  const streamId = await publishEvent({
    type: 'ingest',
    entity,
    layer: 'bronze',
    payload: record,
  });

  return { id, streamId, record };
}
