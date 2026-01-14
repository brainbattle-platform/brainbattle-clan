import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MessagesService } from './messages.service';
import { ConversationsModule } from '../conversations/conversations.module';

@Module({
  imports: [ConversationsModule],
  providers: [PrismaService, MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
