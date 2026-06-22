import { publishEvent } from '../publisher';
import { getLayerSchema, type SchemaRegistry } from '../registry';

export type SilverNormalizeResult = {
  record: Record<string, unknown>;
  streamId: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}

function normalizeEntityFields(
  entity: string,
  raw: Record<string, unknown>,
  id: string,
): Record<string, unknown> {
  switch (entity) {
    case 'email':
      return {
        id,
        subject: String(raw.subject ?? ''),
        from: String(raw.from ?? ''),
        receivedAt: String(raw.receivedAt ?? new Date().toISOString()),
      };
    case 'project':
      return {
        id,
        name: String(raw.name ?? 'Untitled Project'),
        status: String(raw.status ?? 'draft'),
      };
    case 'device':
      return {
        id,
        serialNumber: String(raw.serialNumber ?? raw.serial ?? ''),
        model: String(raw.model ?? ''),
      };
    case 'invoice':
      return {
        id,
        number: String(raw.number ?? ''),
        amount: Number(raw.amount ?? 0),
        currency: String(raw.currency ?? 'USD'),
      };
    case 'payment':
      return {
        id,
        invoiceId: String(raw.invoiceId ?? ''),
        amount: Number(raw.amount ?? 0),
        paidAt: String(raw.paidAt ?? new Date().toISOString()),
      };
    default:
      return { id, ...raw };
  }
}

export async function normalizeSilver(
  entity: string,
  bronzeRecord: Record<string, unknown>,
  registry: SchemaRegistry,
): Promise<SilverNormalizeResult> {
  getLayerSchema(registry, entity, 'silver');

  const id = String(bronzeRecord.id ?? '');
  const raw = asRecord(bronzeRecord.rawPayload);
  const record = normalizeEntityFields(entity, raw, id);

  const streamId = await publishEvent({
    type: 'normalize',
    entity,
    layer: 'silver',
    payload: record,
  });

  return { record, streamId };
}
