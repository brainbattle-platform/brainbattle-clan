import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { CoreEventConsumer } from './core-event.consumer';
import { ConversationsModule } from '../conversations/conversations.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [RedisModule, ConversationsModule, NotificationsModule, RealtimeModule],
  providers: [CoreEventConsumer],
})
export class EventsModule {}
