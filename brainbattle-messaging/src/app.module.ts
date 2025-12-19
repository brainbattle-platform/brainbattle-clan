import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SecurityModule } from './security/security.module';
import { RedisModule } from './redis/redis.module';
import { ConversationsModule } from './conversations/conversations.module';
import { EventsModule } from './events/events.module';
import { RealtimeModule } from './realtime/realtime.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SecurityModule,
    RedisModule,
    ConversationsModule,
    EventsModule,      // start subscribing bb.events
    RealtimeModule,    // socket gateway
  ],
})
export class AppModule {}
