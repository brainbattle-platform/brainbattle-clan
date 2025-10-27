import { Injectable } from '@nestjs/common';
import { createClient } from 'redis';

@Injectable()
export class RateLimitService {
  private r = createClient({ url: process.env.REDIS_URL });

  async onModuleInit() { await this.r.connect(); }
  async onModuleDestroy() { try { await this.r.quit(); } catch {} }

  async allow(userId: string, bucket: string, limit = 20, windowSec = 5) {
    const key = `rl:${bucket}:${userId}`;
    const v = await this.r.incr(key);
    if (v === 1) await this.r.expire(key, windowSec);
    return v <= limit;
  }

  async setPresence(userId: string, online: boolean) {
    const key = `presence:${userId}`;
    if (online) await this.r.set(key, '1', { EX: 120 });
    else await this.r.del(key);
  }
}
