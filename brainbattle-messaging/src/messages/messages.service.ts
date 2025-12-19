import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationsService } from '../conversations/conversations.service';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversations: ConversationsService,
  ) {}

  async send(conversationId: string, senderId: string, content: string) {
    await this.conversations.requireMember(conversationId, senderId);

    const text = (content ?? '').trim();
    if (!text) throw new BadRequestException('empty_message');

    const msg = await this.prisma.message.create({
      data: { conversationId, senderId, content: text },
    });

    return msg;
  }
}
