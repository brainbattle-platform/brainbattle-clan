import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { AdminGuard } from '../security/admin.guard';
import { wrapList, wrapSuccess } from '../shared/response.helper';
import { toMessageDto, toAttachmentDto } from '../shared/dto-mappers';

@ApiTags('Admin')
@UseGuards(AdminGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  @ApiOperation({ summary: 'Admin: list messages' })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'threadId', required: false })
  @ApiQuery({ name: 'senderId', required: false })
  @ApiQuery({ name: 'hasAttachments', required: false, type: Boolean })
  @ApiQuery({ name: 'type', required: false, enum: ['image', 'file', 'link'] })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @Get('messages')
  async listMessages(
    @Query('q') q?: string,
    @Query('threadId') threadId?: string,
    @Query('senderId') senderId?: string,
    @Query('hasAttachments') hasAttachments?: string,
    @Query('type') type?: 'image' | 'file' | 'link',
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    const limitNum = Math.min(parseInt(limit || '50', 10), 200);

    const cursorObj = cursor
      ? (JSON.parse(Buffer.from(cursor, 'base64').toString('utf8')) as {
          createdAt: string;
          id: string;
        })
      : null;

    const where: any = {};

    if (threadId) {
      where.conversationId = threadId;
    }

    if (senderId) {
      where.senderId = senderId;
    }

    if (q) {
      where.content = { contains: q, mode: 'insensitive' as const };
    }

    if (hasAttachments === 'true') {
      where.attachments = { some: {} };
    }

    if (type) {
      where.attachments = {
        some: {
          kind: type,
        },
      };
    }

    const messages = await this.prisma.message.findMany({
      where,
      orderBy: { createdAt: 'desc' as const },
      take: limitNum + 1,
      skip: cursorObj ? 1 : 0,
      ...(cursorObj
        ? {
            cursor: {
              id: cursorObj.id,
            },
          }
        : {}),
      include: {
        attachments: true,
        receipts: true,
      },
    });

    const items = messages.slice(0, limitNum).map((m) =>
      toMessageDto({
        ...m,
        sender: m.senderId
          ? { id: m.senderId, displayName: m.senderId, handle: m.senderId }
          : { id: 'system', displayName: 'System', handle: 'system' },
      }),
    );

    const hasMore = messages.length > limitNum;
    const nextCursor = hasMore
      ? Buffer.from(
          JSON.stringify({
            createdAt: messages[limitNum - 1].createdAt.toISOString(),
            id: messages[limitNum - 1].id,
          }),
        ).toString('base64')
      : null;

    return wrapList(items, nextCursor);
  }

  @ApiOperation({ summary: 'Admin: delete message' })
  @Delete('messages/:messageId')
  async deleteMessage(@Param('messageId') messageId: string) {
    await this.prisma.attachment.deleteMany({ where: { messageId } });
    await this.prisma.message.delete({ where: { id: messageId } });
    return wrapSuccess({ ok: true });
  }

  @ApiOperation({ summary: 'Admin: list attachments' })
  @ApiQuery({ name: 'q', required: false })
  @ApiQuery({ name: 'type', required: false, enum: ['image', 'file', 'link'] })
  @ApiQuery({ name: 'uploaderId', required: false })
  @ApiQuery({ name: 'threadId', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @Get('attachments')
  async listAttachments(
    @Query('q') q?: string,
    @Query('type') type?: 'image' | 'file' | 'link',
    @Query('uploaderId') uploaderId?: string,
    @Query('threadId') threadId?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    const limitNum = Math.min(parseInt(limit || '50', 10), 200);

    const cursorObj = cursor
      ? (JSON.parse(Buffer.from(cursor, 'base64').toString('utf8')) as {
          createdAt: string;
          id: string;
        })
      : null;

    const where: any = {};

    if (type) {
      where.kind = type;
    }

    if (threadId) {
      where.message = {
        conversationId: threadId,
      };
    }

    if (uploaderId) {
      where.message = {
        ...(where.message || {}),
        senderId: uploaderId,
      };
    }

    if (q) {
      where.fileName = { contains: q, mode: 'insensitive' as const };
    }

    const attachments = await this.prisma.attachment.findMany({
      where,
      orderBy: { createdAt: 'desc' as const },
      take: limitNum + 1,
      skip: cursorObj ? 1 : 0,
      ...(cursorObj
        ? {
            cursor: {
              id: cursorObj.id,
            },
          }
        : {}),
    });

    const items = attachments.slice(0, limitNum).map((a) =>
      toAttachmentDto({
        id: a.id,
        kind: a.kind,
        url: a.url ?? a.objectKey,
        thumbnailUrl: a.thumbnailUrl,
        fileName: a.fileName,
        size: a.size,
        mime: a.mime,
        width: a.width,
        height: a.height,
      }),
    );

    const hasMore = attachments.length > limitNum;
    const nextCursor = hasMore
      ? Buffer.from(
          JSON.stringify({
            createdAt: attachments[limitNum - 1].createdAt.toISOString(),
            id: attachments[limitNum - 1].id,
          }),
        ).toString('base64')
      : null;

    return wrapList(items, nextCursor);
  }

  @ApiOperation({ summary: 'Admin: get attachment signed URL' })
  @Get('attachments/:attachmentId/url')
  async getAttachmentUrl(@Param('attachmentId') attachmentId: string) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      return wrapSuccess({ url: null });
    }

    return wrapSuccess({ url: attachment.url ?? attachment.objectKey });
  }

  @ApiOperation({ summary: 'Admin: delete attachment' })
  @Delete('attachments/:attachmentId')
  async deleteAttachment(@Param('attachmentId') attachmentId: string) {
    await this.prisma.attachment.delete({ where: { id: attachmentId } });
    return wrapSuccess({ ok: true });
  }
}
