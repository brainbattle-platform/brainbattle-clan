import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SecurityModule } from './security/security.module';
import { RedisModule } from './redis/redis.module';
import { ConversationsModule } from './conversations/conversations.module';
import { EventsModule } from './events/events.module';
import { RealtimeModule } from './realtime/realtime.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AttachmentsModule } from './attachments/attachments.module';
<<<<<<< Updated upstream
=======
import { MessagesModule } from './messages/messages.module';
>>>>>>> Stashed changes
import { CommunityModule } from './community/community.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SecurityModule,
    RedisModule,
    ConversationsModule,
    MessagesModule,
    CommunityModule,
    NotificationsModule,
    EventsModule,
    RealtimeModule,
    AttachmentsModule,
    CommunityModule,
  ],
})
export class AppModule { }

