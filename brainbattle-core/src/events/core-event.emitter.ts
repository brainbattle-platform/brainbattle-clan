import { Injectable, Inject } from '@nestjs/common';
import { Redis } from 'ioredis';
import { randomUUID } from 'crypto';
import { BB_EVENT_CHANNEL, BbEvent } from './core-events';

@Injectable()
export class CoreEventEmitter {
  constructor(
    @Inject('REDIS_PUBLISHER')
    private readonly redis: Redis,
  ) {}

  async emit<T extends string, D>(type: T, data: D): Promise<BbEvent<T, D>> {
    const event: BbEvent<T, D> = {
      id: randomUUID(),
      type,
      ts: new Date().toISOString(),
      source: 'core',
      data,
    };

    await this.redis.publish(BB_EVENT_CHANNEL, JSON.stringify(event));
    return event;
  }
}
