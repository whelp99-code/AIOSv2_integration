import { readFile, readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse } from 'yaml';
import { z } from 'zod';

const FieldDefSchema = z.object({
  name: z.string(),
  type: z.string(),
  required: z.boolean().optional().default(false),
  format: z.string().optional(),
});

const LayerSchema = z.object({
  description: z.string().optional(),
  fields: z.array(FieldDefSchema),
});

export const EntitySchemaDefSchema = z.object({
  entity: z.string(),
  version: z.number().optional().default(1),
  layers: z.object({
    bronze: LayerSchema,
    silver: LayerSchema,
    gold: LayerSchema,
  }),
});

export type DataLayer = 'bronze' | 'silver' | 'gold';
export type FieldDef = z.infer<typeof FieldDefSchema>;
export type LayerDef = z.infer<typeof LayerSchema>;
export type EntitySchemaDef = z.infer<typeof EntitySchemaDefSchema>;
export type SchemaRegistry = Record<string, EntitySchemaDef>;

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const defaultSchemasDir = join(packageRoot, 'schemas');

export async function loadRegistry(schemasDir = defaultSchemasDir): Promise<SchemaRegistry> {
  const entries = await readdir(schemasDir);
  const registry: SchemaRegistry = {};

  for (const entry of entries) {
    if (!entry.endsWith('.yaml')) continue;

    const content = await readFile(join(schemasDir, entry), 'utf8');
    const parsed = EntitySchemaDefSchema.parse(parse(content));
    registry[parsed.entity] = parsed;
  }

  return registry;
}

export function getLayerSchema(
  registry: SchemaRegistry,
  entity: string,
  layer: DataLayer,
): LayerDef {
  const schema = registry[entity];
  if (!schema) {
    throw new Error(`Unknown entity schema: ${entity}`);
  }

  return schema.layers[layer];
}
