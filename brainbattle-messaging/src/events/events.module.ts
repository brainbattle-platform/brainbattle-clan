import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { CoreEventConsumer } from './core-event.consumer';
import { ConversationsModule } from '../conversations/conversations.module';

@Module({
  imports: [RedisModule, ConversationsModule],
  providers: [CoreEventConsumer],
})
export class EventsModule {}
