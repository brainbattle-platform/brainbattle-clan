import { Module } from '@nestjs/common';
import { CommunityController } from './community.controller';
import { ConversationsModule } from '../conversations/conversations.module';
import { MessagesModule } from '../messages/messages.module';
import { PrismaService } from '../prisma/prisma.service';
import { PresenceService } from '../shared/presence.service';

@Module({
  imports: [ConversationsModule, MessagesModule],
  controllers: [CommunityController],
  providers: [PrismaService, PresenceService],
})
export class CommunityModule {}
