import { Module } from '@nestjs/common';
import { Redis } from 'ioredis';

@Module({
  providers: [
    {
      provide: 'REDIS_PUBLISHER',
      useFactory: () => {
        return new Redis(process.env.REDIS_URL!);
      },
    },
  ],
  exports: ['REDIS_PUBLISHER'],
})
export class RedisModule {}
