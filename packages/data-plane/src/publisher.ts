import Redis from 'ioredis';

import type { DataLayer } from './registry';

export const DEFAULT_REDIS_URL = 'redis://127.0.0.1:6382';
export const DEFAULT_STREAM = 'aios:data-plane:events';

export type DataPlaneEvent = {
  type: string;
  entity: string;
  layer: DataLayer;
  payload: unknown;
};

export type PublishEventOptions = {
  redisUrl?: string;
  stream?: string;
  redis?: Redis;
};

function resolveRedisUrl(redisUrl?: string): string {
  return redisUrl ?? process.env.REDIS_URL ?? DEFAULT_REDIS_URL;
}

export async function publishEvent(
  event: DataPlaneEvent,
  options: PublishEventOptions = {},
): Promise<string> {
  const stream = options.stream ?? DEFAULT_STREAM;
  const ownsClient = !options.redis;
  const redis = options.redis ?? new Redis(resolveRedisUrl(options.redisUrl));

  try {
    const id = await redis.xadd(
      stream,
      '*',
      'type',
      event.type,
      'entity',
      event.entity,
      'layer',
      event.layer,
      'payload',
      JSON.stringify(event.payload),
      'ts',
      new Date().toISOString(),
    );

    return id ?? '';
  } finally {
    if (ownsClient) {
      await redis.quit();
    }
  }
}
