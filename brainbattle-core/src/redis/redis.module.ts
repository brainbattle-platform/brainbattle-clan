import { Module } from '@nestjs/common';
import Redis from 'ioredis';

@Module({
  providers: [
    {
      provide: 'REDIS_PUBLISHER',
      useFactory: () =>
        new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379'),
    },
    {
      provide: 'REDIS_SUBSCRIBER',
      useFactory: () =>
        new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379'),
    },
  ],
  exports: ['REDIS_PUBLISHER', 'REDIS_SUBSCRIBER'],
})
export class RedisModule {}
