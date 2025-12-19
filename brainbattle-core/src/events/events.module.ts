import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { CoreEventEmitter } from './core-event.emitter';

@Module({
  imports: [RedisModule],
  providers: [CoreEventEmitter],
  exports: [CoreEventEmitter],
})
export class EventsModule {}
