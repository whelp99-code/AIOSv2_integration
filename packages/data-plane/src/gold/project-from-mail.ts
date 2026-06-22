import { randomUUID } from 'node:crypto';

import { publishEvent } from '../publisher';
import { getLayerSchema, type SchemaRegistry } from '../registry';

export type ProjectFromMailResult = {
  project: Record<string, unknown>;
  streamId: string;
};

export async function projectFromMail(
  mailRecord: Record<string, unknown>,
  registry: SchemaRegistry,
): Promise<ProjectFromMailResult> {
  getLayerSchema(registry, 'project', 'gold');

  const project = {
    id: randomUUID(),
    name: String(mailRecord.subject ?? 'Untitled Project'),
    sourceMailId: String(mailRecord.id ?? ''),
    createdAt: new Date().toISOString(),
  };

  const streamId = await publishEvent({
    type: 'project-from-mail',
    entity: 'project',
    layer: 'gold',
    payload: project,
  });

  return { project, streamId };
}
