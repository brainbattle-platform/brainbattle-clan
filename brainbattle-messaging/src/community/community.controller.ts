import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiHeader,
  ApiQuery,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { ConversationsService } from '../conversations/conversations.service';
import { MessagesService } from '../messages/messages.service';
import { PresenceService } from '../shared/presence.service';
import { PrismaService } from '../prisma/prisma.service';
import { wrapSuccess, wrapList } from '../shared/response.helper';
import { toThreadDto, toMessageDto, toUserLiteDto, toAttachmentDto } from '../shared/dto-mappers';
import {
  SendMessageRequestDto,
  ThreadsListResponseDto,
  ThreadResponseDto,
  MessagesListResponseDto,
  MessageResponseDto,
  MarkReadResponseDto,
  ActiveUsersListResponseDto,
} from './dto/community-swagger.dto';

@ApiTags('Community')
@Controller('community')
export class CommunityController {
  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly messagesService: MessagesService,
    private readonly presenceService: PresenceService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * GET /community/threads
   * List all threads (conversations) for the authenticated user
   * Query params: type (all|dm|clan), filter (unread), q (search), limit, cursor
   */
  @ApiOperation({ summary: 'List threads', description: 'Get conversation threads with filters' })
  @ApiHeader({ name: 'x-user-id', required: false, description: 'User ID (fallback: "me")' })
  @ApiQuery({ name: 'type', required: false, enum: ['all', 'dm', 'clan'] })
  @ApiQuery({ name: 'filter', required: false, enum: ['unread'] })
  @ApiQuery({ name: 'q', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiResponse({ status: 200, type: ThreadsListResponseDto })
  @Get('threads')
  async getThreads(
    @Headers('x-user-id') userId?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('type') type?: 'all' | 'dm' | 'clan',
    @Query('filter') filter?: 'unread',
    @Query('q') q?: string,
  ) {
    const currentUserId = userId || 'me';
    const limitNum = Math.min(parseInt(limit || '20', 10), 100);

    // Validate type parameter
    if (type && !['all', 'dm', 'clan'].includes(type)) {
      throw new BadRequestException('Invalid type parameter. Must be one of: all, dm, clan');
    }

    // Track user presence
    await this.presenceService.touch(currentUserId);

    // Build where clause for type filter
    const typeFilter: any = {};
    if (type === 'dm') {
      typeFilter.type = 'dm';
    } else if (type === 'clan') {
      typeFilter.type = 'clan';
    }

    // Fetch conversations with members and latest message
    const conversations = await this.prisma.conversationMember.findMany({
      where: {
        userId: currentUserId,
        leftAt: null,
        conversation: typeFilter,
      },
      select: {
        conversation: {
          select: {
            id: true,
            type: true,
            clanId: true,
            title: true,
            avatarUrl: true,
            updatedAt: true,
            members: {
              where: { leftAt: null },
              select: {
                userId: true,
                joinedAt: true,
              },
              orderBy: { joinedAt: 'asc' },
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: {
                id: true,
                content: true,
                createdAt: true,
                senderId: true,
                kind: true,
              },
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });

    // Get unread counts for all conversations
    const conversationIds = conversations.map((c) => c.conversation.id);
    const unreadCounts = await this.getUnreadCounts(currentUserId, conversationIds);

    // Map to ThreadDto
    let threads = await Promise.all(
      conversations.map(async ({ conversation: conv }) => {
        const isClan = conv.type === 'clan';
        const members = conv.members || [];
        const memberCount = members.length;

        // Determine title
        let title = conv.title || '';
        if (!title) {
          if (isClan) {
            title = conv.clanId ? `Clan ${conv.clanId}` : 'Clan Chat';
          } else {
            // DM: use other participant's name
            const otherMember = members.find((m) => m.userId !== currentUserId);
            title = otherMember ? `User ${otherMember.userId.slice(0, 8)}` : 'Direct Message';
          }
        }

        // Map participants (all members for contract)
        const participants = members.map((m) =>
          toUserLiteDto({
            id: m.userId,
            handle: m.userId,
            displayName: m.userId === currentUserId ? 'You' : `User ${m.userId.slice(0, 8)}`,
            avatarUrl: null,
          }),
        );

        // Get last message preview
        const lastMsg = conv.messages[0];
        let lastMessagePreview = 'No messages yet';
        let lastMessageAt = conv.updatedAt;

        if (lastMsg) {
          lastMessageAt = lastMsg.createdAt;
          if (lastMsg.kind === 'system') {
            lastMessagePreview = lastMsg.content || 'System message';
          } else if (lastMsg.kind === 'attachment') {
            lastMessagePreview = 'Attachment';
          } else {
            lastMessagePreview = lastMsg.content || '';
          }
          // Truncate preview
          if (lastMessagePreview.length > 100) {
            lastMessagePreview = lastMessagePreview.slice(0, 100) + '...';
          }
        }

        const unreadCount = unreadCounts[conv.id] || 0;

        return {
          conv,
          thread: toThreadDto({
            id: conv.id,
            title,
            isClan,
            memberCount,
            participants,
            lastMessagePreview,
            lastMessageAt:
              lastMessageAt instanceof Date
                ? lastMessageAt.toISOString()
                : lastMessageAt,
            unreadCount,
            avatarUrl: conv.avatarUrl || undefined,
            seenBySummary: undefined,
          }),
          unreadCount,
        };
      }),
    );

    // Apply search filter
    if (q) {
      const query = q.toLowerCase();
      threads = threads.filter((t) => {
        const titleMatch = t.thread.title.toLowerCase().includes(query);
        const participantMatch = t.thread.participants.some((p) =>
          p.displayName.toLowerCase().includes(query) || p.handle.toLowerCase().includes(query),
        );
        return titleMatch || participantMatch;
      });
    }

    // Apply unread filter
    if (filter === 'unread') {
      threads = threads.filter((t) => t.unreadCount > 0);
    }

    // Sort by last message time (most recent first)
    threads.sort((a, b) => {
      const timeA = new Date(a.thread.lastMessageAt).getTime();
      const timeB = new Date(b.thread.lastMessageAt).getTime();
      return timeB - timeA;
    });

    // Cursor pagination
    const hasMore = threads.length > limitNum;
    const items = hasMore ? threads.slice(0, limitNum).map((t) => t.thread) : threads.map((t) => t.thread);
    const nextCursor = hasMore
      ? Buffer.from(
          JSON.stringify({
            lastMessageAt: items[items.length - 1].lastMessageAt,
            id: items[items.length - 1].id,
          }),
        ).toString('base64')
      : null;

    return wrapList(items, nextCursor);
  }

  /**
   * Helper: Calculate unread counts for conversations
   */
  private async getUnreadCounts(
    userId: string,
    conversationIds: string[],
  ): Promise<Record<string, number>> {
    if (conversationIds.length === 0) return {};

    // Fetch read receipts for user
    const receipts = await this.prisma.readReceipt.findMany({
      where: {
        userId,
        conversationId: { in: conversationIds },
      },
      select: {
        conversationId: true,
        lastReadAt: true,
      },
    });

    const receiptMap = new Map(
      receipts.map((r) => [r.conversationId, r.lastReadAt]),
    );

    // Count unread messages for each conversation
    const unreadCounts: Record<string, number> = {};

    for (const convId of conversationIds) {
      const lastReadAt = receiptMap.get(convId);

      if (!lastReadAt) {
        // No read receipt: count all messages except user's own
        const count = await this.prisma.message.count({
          where: {
            conversationId: convId,
            senderId: { not: userId },
          },
        });
        unreadCounts[convId] = count;
      } else {
        // Count messages after lastReadAt
        const count = await this.prisma.message.count({
          where: {
            conversationId: convId,
            senderId: { not: userId },
            createdAt: { gt: lastReadAt },
          },
        });
        unreadCounts[convId] = count;
      }
    }

    return unreadCounts;
  }

  /**
   * GET /community/threads/:id
   * Get details of a single thread (conversation)
   */
  @ApiOperation({ summary: 'Get thread details', description: 'Fetch detailed information about a single conversation thread' })
  @ApiHeader({ name: 'x-user-id', required: false, description: 'User ID (fallback: "me")' })
  @ApiParam({ name: 'id', type: String, example: 'conv_xyz789', description: 'Thread ID' })
  @ApiResponse({ status: 200, type: ThreadResponseDto })
  @ApiResponse({ status: 404, description: 'Thread not found' })
  @ApiResponse({ status: 403, description: 'Not a member of this thread' })
  @Get('threads/:id')
  async getThread(
    @Headers('x-user-id') userId: string | undefined,
    @Param('id') threadId: string,
  ) {
    const currentUserId = userId || 'me';

    // Track user presence
    await this.presenceService.touch(currentUserId);

    // Verify membership
    await this.conversationsService.requireMember(threadId, currentUserId);

    // Fetch conversation with members
    const conv = await this.prisma.conversation.findUnique({
      where: { id: threadId },
      select: {
        id: true,
        type: true,
        clanId: true,
        title: true,
        avatarUrl: true,
        updatedAt: true,
        members: {
          where: { leftAt: null },
          select: {
            userId: true,
            joinedAt: true,
          },
          orderBy: { joinedAt: 'asc' },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            id: true,
            content: true,
            createdAt: true,
            senderId: true,
            kind: true,
          },
        },
      },
    });

    if (!conv) {
      throw new NotFoundException('Thread not found');
    }

    const isClan = conv.type === 'clan';
    const members = conv.members || [];
    const memberCount = members.length;

    // Determine title
    let title = conv.title || '';
    if (!title) {
      if (isClan) {
        title = conv.clanId ? `Clan ${conv.clanId}` : 'Clan Chat';
      } else {
        const otherMember = members.find((m) => m.userId !== currentUserId);
        title = otherMember ? `User ${otherMember.userId.slice(0, 8)}` : 'Direct Message';
      }
    }

    // Map all participants
    const participants = members.map((m) =>
      toUserLiteDto({
        id: m.userId,
        handle: m.userId,
        displayName: m.userId === currentUserId ? 'You' : `User ${m.userId.slice(0, 8)}`,
        avatarUrl: null,
      }),
    );

    // Get last message preview
    const lastMsg = conv.messages[0];
    let lastMessagePreview = 'No messages yet';
    let lastMessageAt = conv.updatedAt;

    if (lastMsg) {
      lastMessageAt = lastMsg.createdAt;
      if (lastMsg.kind === 'system') {
        lastMessagePreview = lastMsg.content || 'System message';
      } else if (lastMsg.kind === 'attachment') {
        lastMessagePreview = 'Attachment';
      } else {
        lastMessagePreview = lastMsg.content || '';
      }
      if (lastMessagePreview.length > 100) {
        lastMessagePreview = lastMessagePreview.slice(0, 100) + '...';
      }
    }

    // Calculate unread count
    const unreadCounts = await this.getUnreadCounts(currentUserId, [threadId]);
    const unreadCount = unreadCounts[threadId] || 0;

    // Get seen by summary
    let seenBySummary: string | undefined;
    if (lastMsg) {
      const readReceipts = await this.prisma.readReceipt.findMany({
        where: {
          conversationId: threadId,
          userId: { not: currentUserId },
          lastReadAt: { gte: lastMsg.createdAt },
        },
        select: { userId: true },
        take: 4,
      });

      if (readReceipts.length > 0) {
        const names = readReceipts
          .slice(0, 3)
          .map((r) => `User ${r.userId.slice(0, 8)}`);
        if (readReceipts.length > 3) {
          seenBySummary = `Seen by ${names.join(', ')} and ${readReceipts.length - 3} others`;
        } else {
          seenBySummary = `Seen by ${names.join(', ')}`;
        }
      }
    }

    const thread = toThreadDto({
      id: conv.id,
      title,
      isClan,
      memberCount,
      participants,
      lastMessagePreview,
      lastMessageAt:
        lastMessageAt instanceof Date ? lastMessageAt.toISOString() : lastMessageAt,
      unreadCount,
      avatarUrl: conv.avatarUrl || undefined,
      seenBySummary,
    });

    return wrapSuccess(thread);
  }

  /**
   * GET /community/threads/:id/messages
   * Get messages in a thread (conversation)
   * Returns data.items with cursor pagination
   */
  @ApiOperation({ summary: 'Get thread messages', description: 'Fetch messages from a thread with cursor-based pagination' })
  @ApiHeader({ name: 'x-user-id', required: false, description: 'User ID (fallback: "me")' })
  @ApiParam({ name: 'id', type: String, example: 'conv_xyz789', description: 'Thread ID' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50, description: 'Max messages per page (default 50, max 100)' })
  @ApiQuery({ name: 'cursor', required: false, type: String, description: 'Base64 encoded cursor for pagination' })
  @ApiResponse({ status: 200, type: MessagesListResponseDto })
  @ApiResponse({ status: 403, description: 'Not a member of this thread' })
  @Get('threads/:id/messages')
  async getMessages(
    @Headers('x-user-id') userId: string | undefined,
    @Param('id') threadId: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    const currentUserId = userId || 'me';
    const limitNum = Math.min(parseInt(limit || '50', 10), 100);

    // Track user presence
    await this.presenceService.touch(currentUserId);

    // Verify membership
    await this.conversationsService.requireMember(threadId, currentUserId);

    // Build cursor condition
    let cursorCondition: any = {};
    if (cursor) {
      try {
        const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString());
        cursorCondition = {
          OR: [
            { createdAt: { lt: new Date(decoded.createdAt) } },
            {
              AND: [
                { createdAt: new Date(decoded.createdAt) },
                { id: { lt: decoded.id } },
              ],
            },
          ],
        };
      } catch (e) {
        throw new BadRequestException('Invalid cursor');
      }
    }

    // Fetch messages with attachments
    const messages = await this.prisma.message.findMany({
      where: {
        conversationId: threadId,
        ...cursorCondition,
      },
      include: {
        attachments: true,
      },
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
      take: limitNum + 1,
    });

    // Check if there are more messages
    const hasMore = messages.length > limitNum;
    const items = hasMore ? messages.slice(0, limitNum) : messages;

    // Map to MessageDto
    const mapped = items.map((msg) => {
      const sender = msg.senderId
        ? {
            id: msg.senderId,
            handle: msg.senderId,
            displayName:
              msg.senderId === currentUserId
                ? 'You'
                : `User ${msg.senderId.slice(0, 8)}`,
            avatarUrl: null,
          }
        : null;

      return {
        id: msg.id,
        conversationId: msg.conversationId,
        sender,
        text: msg.content || undefined,
        attachments: msg.attachments.map((att) => toAttachmentDto(att)),
        createdAt: msg.createdAt instanceof Date ? msg.createdAt.toISOString() : msg.createdAt,
        status: 'delivered' as const,
        readBy: [],
      };
    });

    // Generate next cursor
    const nextCursor = hasMore
      ? Buffer.from(
          JSON.stringify({
            createdAt: items[items.length - 1].createdAt,
            id: items[items.length - 1].id,
          }),
        ).toString('base64')
      : null;

    return wrapList(mapped, nextCursor);
  }

  /**
   * POST /community/threads/:id/messages
   * Send a message in a thread (REST version, not WebSocket)
   * Body: { text?: string, attachments?: AttachmentInput[] }
   * AttachmentInput: { type, url, thumbnailUrl?, fileName?, sizeBytes?, mimeType? }
   */
  @ApiOperation({ summary: 'Send message', description: 'Post a new message to a thread (text and/or attachments)' })
  @ApiHeader({ name: 'x-user-id', required: false, description: 'User ID (fallback: "me")' })
  @ApiParam({ name: 'id', type: String, example: 'conv_xyz789', description: 'Thread ID' })
  @ApiResponse({ status: 201, type: MessageResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid message (empty or exceeds limits)' })
  @ApiResponse({ status: 403, description: 'Not a member of this thread' })
  @Post('threads/:id/messages')
  async sendMessage(
    @Headers('x-user-id') userId: string | undefined,
    @Param('id') threadId: string,
    @Body() body: { text?: string; attachments?: any[] },
  ) {
    const currentUserId = userId || 'me';
    const { text, attachments } = body;

    // Validate: must have text or attachments
    if ((!text || text.trim().length === 0) && (!attachments || attachments.length === 0)) {
      throw new BadRequestException('Message must contain either text or attachments');
    }

    // Validate text length
    if (text && text.length > 10000) {
      throw new BadRequestException('Text exceeds maximum length of 10,000 characters');
    }

    // Validate attachments
    if (attachments && attachments.length > 10) {
      throw new BadRequestException('Maximum 10 attachments per message');
    }

    // Track user presence
    await this.presenceService.touch(currentUserId);

    // Verify membership
    await this.conversationsService.requireMember(threadId, currentUserId);

    // Determine message kind
    let kind: 'text' | 'attachment' = 'text';
    if (attachments && attachments.length > 0) {
      kind = 'attachment';
    }

    // Create message with attachments in transaction
    const message = await this.prisma.$transaction(async (tx) => {
      // Create message
      const msg = await tx.message.create({
        data: {
          conversationId: threadId,
          senderId: currentUserId,
          kind,
          content: text?.trim() || null,
        },
      });

      // Create attachments if any
      const createdAttachments: any[] = [];
      if (attachments && attachments.length > 0) {
        for (const att of attachments) {
          const created = await tx.attachment.create({
            data: {
              messageId: msg.id,
              kind: att.type === 'image' ? 'image' : 'file',
              mime: att.mimeType || 'application/octet-stream',
              size: att.sizeBytes || 0,
              bucket: 'uploads',
              objectKey: att.url,
              url: att.url,
              thumbnailUrl: att.thumbnailUrl,
              fileName: att.fileName,
              width: att.width,
              height: att.height,
            },
          });
          createdAttachments.push(created);
        }
      }

      // Update conversation updatedAt
      await tx.conversation.update({
        where: { id: threadId },
        data: { updatedAt: new Date() },
      });

      return { ...msg, attachments: createdAttachments };
    });

    // Map to MessageDto
    const mapped = {
      id: message.id,
      conversationId: message.conversationId,
      sender: {
        id: currentUserId,
        handle: currentUserId,
        displayName: 'You',
        avatarUrl: null,
      },
      text: message.content || undefined,
      attachments: message.attachments.map((att) => toAttachmentDto(att)),
      createdAt: message.createdAt instanceof Date ? message.createdAt.toISOString() : message.createdAt,
      status: 'delivered' as const,
      readBy: [],
    };

    return wrapSuccess(mapped);
  }

  /**
   * POST /community/threads/:id/read
   * Mark a thread as read (empty body)
   * Returns: { unreadCount: 0, markedAt: ISO8601 }
   */
  @ApiOperation({ summary: 'Mark thread as read', description: 'Mark all messages in a thread as read for current user' })
  @ApiHeader({ name: 'x-user-id', required: false, description: 'User ID (fallback: "me")' })
  @ApiParam({ name: 'id', type: String, example: 'conv_xyz789', description: 'Thread ID' })
  @ApiResponse({ status: 200, type: MarkReadResponseDto })
  @ApiResponse({ status: 403, description: 'Not a member of this thread' })
  @Post('threads/:id/read')
  async markRead(
    @Headers('x-user-id') userId: string | undefined,
    @Param('id') threadId: string,
  ) {
    const currentUserId = userId || 'me';

    // Track user presence
    await this.presenceService.touch(currentUserId);

    // Verify membership
    await this.conversationsService.requireMember(threadId, currentUserId);

    // Upsert read receipt with current timestamp
    const now = new Date();
    await this.prisma.readReceipt.upsert({
      where: {
        conversationId_userId: {
          conversationId: threadId,
          userId: currentUserId,
        },
      },
      update: {
        lastReadAt: now,
      },
      create: {
        conversationId: threadId,
        userId: currentUserId,
        lastReadAt: now,
      },
    });

    return wrapSuccess({
      unreadCount: 0,
      markedAt: now.toISOString(),
    });
  }

  /**
   * GET /community/presence/active
   * Get list of users currently active
   * Returns data.items: UserLite[] with isActiveNow=true
   */
  @ApiOperation({ summary: 'List active users', description: 'Get users currently online (active within last 5 minutes)' })
  @ApiHeader({ name: 'x-user-id', required: false, description: 'User ID (fallback: "me")' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20, description: 'Max users per page (default 20, max 100)' })
  @ApiQuery({ name: 'cursor', required: false, type: String, description: 'Base64 encoded cursor for pagination' })
  @ApiResponse({ status: 200, type: ActiveUsersListResponseDto })
  @Get('presence/active')
  async getActiveUsers(
    @Headers('x-user-id') userId: string | undefined,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    const currentUserId = userId || 'me';
    const limitNum = Math.min(parseInt(limit || '20', 10), 100);

    // Track current user presence
    await this.presenceService.touch(currentUserId);

    // Fetch real active users from presence tracking
    const { users, nextCursor } = await this.presenceService.listActive(limitNum, cursor);

    // Map to UserLite format
    const items = users.map((u) =>
      toUserLiteDto({
        id: u.userId,
        handle: u.userId,
        displayName: u.userId === currentUserId ? 'You' : `User ${u.userId.slice(0, 8)}`,
        avatarUrl: null,
        isActiveNow: u.isActiveNow,
        lastActiveAt:
          u.lastActiveAt instanceof Date
            ? u.lastActiveAt.toISOString()
            : u.lastActiveAt,
      }),
    );

    return wrapList(items, nextCursor);
  }
}
