import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { MessagesService } from '../messages/messages.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationsModule } from '../conversations/conversations.module';
import { SecurityModule } from 'src/security/security.module';
@Module({
  imports: [ConversationsModule, SecurityModule],
  providers: [ChatGateway, MessagesService, PrismaService],
})
export class RealtimeModule {}
