import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationsService } from '../conversations/conversations.service';

@Injectable()
export class MessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversations: ConversationsService,
  ) {}

  /**
   * Send text message
   */
  async send(conversationId: string, senderId: string, content: string) {
    await this.conversations.requireMember(conversationId, senderId);

    const text = (content ?? '').trim();
    if (!text) throw new BadRequestException('empty_message');

    const msg = await this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        content: text,
        kind: 'text',
      },
      include: {
        attachments: true,
        receipts: true,
      },
    });

    return msg;
  }

  /**
   * Send message with attachment
   * Attachment must be created first via AttachmentsService.uploadAttachment
   */
  async sendWithAttachment(
    conversationId: string,
    senderId: string,
    attachmentId: string,
    content?: string,
  ) {
    await this.conversations.requireMember(conversationId, senderId);

    // Verify attachment exists and belongs to conversation
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) throw new BadRequestException('Attachment not found');
    if (attachment.conversationId !== conversationId) {
      throw new BadRequestException('Attachment does not belong to this conversation');
    }

    // Create message with attachment
    const msg = await this.prisma.message.create({
      data: {
        conversationId,
        senderId,
        kind: 'attachment',
        content: (content ?? '').trim() || null,
      },
      include: {
        attachments: true,
        receipts: true,
      },
    });

    return msg;
  }

  /**
   * Edit message (text only, for now)
   */
  async editMessage(messageId: string, userId: string, newContent: string) {
    const msg = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!msg) throw new BadRequestException('Message not found');
    if (msg.senderId !== userId) throw new BadRequestException('Not authorized');

    const text = (newContent ?? '').trim();
    if (!text) throw new BadRequestException('Content cannot be empty');

    return this.prisma.message.update({
      where: { id: messageId },
      data: { content: text },
      include: {
        attachments: true,
        receipts: true,
      },
    });
  }

  /**
   * Delete message
   */
  async deleteMessage(messageId: string, userId: string) {
    const msg = await this.prisma.message.findUnique({
      where: { id: messageId },
    });

    if (!msg) throw new BadRequestException('Message not found');
    if (msg.senderId !== userId) throw new BadRequestException('Not authorized');

    await this.prisma.message.delete({
      where: { id: messageId },
    });

    return { ok: true };
  }
}
