import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Headers,
} from '@nestjs/common';
import { ConversationsService } from '../conversations/conversations.service';
import { MessagesService } from '../messages/messages.service';
import { PresenceService } from '../shared/presence.service';
import { wrapSuccess, wrapList } from '../shared/response.helper';
import { toThreadDto, toMessageDto, toUserLiteDto } from '../shared/dto-mappers';

@Controller('community')
export class CommunityController {
  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly messagesService: MessagesService,
    private readonly presenceService: PresenceService,
  ) {}

  /**
   * GET /community/threads
   * List all threads (conversations) for the authenticated user
   * Query params: type (all|dm|clan), filter (unread), q (search), limit, cursor
   */
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
    const limitNum = Math.min(parseInt(limit || '20', 10), 50);

    // Track user presence
    await this.presenceService.touch(currentUserId);

    const conversations = await this.conversationsService.listMyConversations(
      currentUserId,
    );

    // Apply type filter
    let filtered = conversations;
    if (type === 'dm') {
      filtered = filtered.filter((c) => c.clanId === null);
    } else if (type === 'clan') {
      filtered = filtered.filter((c) => c.clanId !== null);
    }

    // Apply search filter (simple title match)
    if (q) {
      const query = q.toLowerCase();
      filtered = filtered.filter((c) => {
        const title = c.clanId ? `Clan ${c.clanId}` : 'Thread';
        return title.toLowerCase().includes(query);
      });
    }

    // Map to ThreadDto with real participants
    const threads = await Promise.all(
      filtered.map(async (conv) => {
        const isClan = conv.clanId != null;
        const title = isClan ? `Clan ${conv.clanId}` : 'Direct Message';
        
        // Use included members data (no additional query needed)
        const members = (conv as any).members || [];
        const memberCount = members.length;
        
        // Map members to UserLite (preview: first 3 for clans, all for DMs)
        const participantUserIds = isClan 
          ? members.slice(0, 3).map(m => m.userId)
          : members.map(m => m.userId);
        
        const participants = participantUserIds.map(uid => 
          toUserLiteDto({ 
            id: uid, 
            name: uid === currentUserId ? 'You' : `User ${uid.slice(0, 4)}`,
            avatarUrl: null 
          })
        );

        return toThreadDto({
          id: conv.id,
          title,
          isClan,
          memberCount,
          participants,
          lastMessagePreview: 'No messages yet',
          lastMessageAt: conv.updatedAt instanceof Date ? conv.updatedAt.toISOString() : conv.updatedAt,
          unreadCount: 0, // TODO: implement read receipts
          avatarUrl: undefined,
          seenBySummary: undefined,
        });
      })
    );

    // Cursor pagination
    const hasMore = threads.length > limitNum;
    const items = hasMore ? threads.slice(0, limitNum) : threads;
    const nextCursor = hasMore ? `cursor_${items.length}` : null;

    return wrapList(items, nextCursor);
  }

  /**
   * GET /community/threads/:id
   * Get details of a single thread (conversation)
   */
  @Get('threads/:id')
  async getThread(
    @Headers('x-user-id') userId: string | undefined,
    @Param('id') threadId: string,
  ) {
    const currentUserId = userId || 'me';

    // Track user presence
    await this.presenceService.touch(currentUserId);

    // Fetch conversation with members
    const conversations = await this.conversationsService.listMyConversations(
      currentUserId,
    );
    const conv = conversations.find((c) => c.id === threadId);

    if (!conv) {
      throw new Error('Thread not found');
    }

    const isClan = conv.clanId != null;
    const title = isClan ? `Clan ${conv.clanId}` : 'Direct Message';
    
    // Fetch real conversation members
    const members = await this.conversationsService.getConversationMembers(conv.id);
    const memberCount = members.length;
    
    // Map all members to UserLite for thread detail
    const participants = members.map(m => 
      toUserLiteDto({ 
        id: m.userId, 
        name: m.userId === currentUserId ? 'You' : `User ${m.userId.slice(0, 4)}`,
        avatarUrl: null 
      })
    );

    const thread = toThreadDto({
      id: conv.id,
      title,
      isClan,
      memberCount,
      participants,
      lastMessagePreview: 'No messages yet',
      lastMessageAt: conv.updatedAt instanceof Date ? conv.updatedAt.toISOString() : conv.updatedAt,
      unreadCount: 0,
      avatarUrl: isClan ? 'https://cdn.example.com/clans/default.png' : undefined,
      seenBySummary: undefined,
    });

    return wrapSuccess(thread);
  }

  /**
   * GET /community/threads/:id/messages
   * Get messages in a thread (conversation)
   * Returns data.items with cursor pagination
   */
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

    const messages = await this.conversationsService.getMessages(
      threadId,
      currentUserId,
      limitNum,
      cursor,
    );

    // Map to MessageDto
    const mapped = messages.map((msg) =>
      toMessageDto(
        msg,
        { id: msg.senderId || currentUserId, name: msg.senderId === currentUserId ? 'You' : 'User' },
        [currentUserId], // readBy includes current user
      ),
    );

    // Cursor pagination
    const hasMore = mapped.length > limitNum;
    const items = hasMore ? mapped.slice(0, limitNum) : mapped;
    const nextCursor = hasMore ? `cursor_${items[items.length - 1].id}` : null;

    return wrapList(items, nextCursor);
  }

  /**
   * POST /community/threads/:id/messages
   * Send a message in a thread (REST version, not WebSocket)
   * Body: { text?: string, attachments?: AttachmentInput[] }
   * AttachmentInput: { type, url, thumbnailUrl?, fileName?, sizeBytes?, mimeType? }
   */
  @Post('threads/:id/messages')
  async sendMessage(
    @Headers('x-user-id') userId: string | undefined,
    @Param('id') threadId: string,
    @Body() body: { text?: string; attachments?: any[] },
  ) {
    const currentUserId = userId || 'me';

    // Track user presence
    await this.presenceService.touch(currentUserId);

    // Send message via MessagesService
    const message = await this.messagesService.send(
      threadId,
      currentUserId,
      body.text || '',
    );

    // Map attachments if provided (inline attachment support)
    const attachments = (body.attachments || []).map((att, idx) => ({
      id: `att_${message.id}_${idx}`,
      type: att.type || 'file',
      url: att.url,
      thumbnailUrl: att.thumbnailUrl,
      fileName: att.fileName,
      sizeBytes: att.sizeBytes,
      mimeType: att.mimeType,
    }));

    // Map to MessageDto
    const mapped = toMessageDto(
      { ...message, attachments },
      { id: currentUserId, name: 'You', avatarUrl: 'https://i.pravatar.cc/150?img=3' },
      [currentUserId],
    );

    return wrapSuccess(mapped);
  }

  /**
   * POST /community/threads/:id/read
   * Mark a thread as read (empty body)
   * Returns: { unreadCount: 0, markedAt: ISO8601 }
   */
  @Post('threads/:id/read')
  async markRead(
    @Headers('x-user-id') userId: string | undefined,
    @Param('id') threadId: string,
  ) {
    const currentUserId = userId || 'me';
    const markedAt = new Date().toISOString();

    // Track user presence
    await this.presenceService.touch(currentUserId);

    // Call markRead with current timestamp
    await this.conversationsService.markRead(
      threadId,
      currentUserId,
      markedAt,
    );

    return wrapSuccess({ unreadCount: 0, markedAt });
  }

  /**
   * GET /community/presence/active
   * Get list of users currently active
   * Returns data.items: UserLite[] with isActiveNow=true
   */
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
    const items = users.map(u => 
      toUserLiteDto({
        id: u.userId,
        name: u.userId === currentUserId ? 'You' : `User ${u.userId.slice(0, 4)}`,
        avatarUrl: null,
        isActiveNow: u.isActiveNow,
        lastActiveAt: u.lastActiveAt instanceof Date ? u.lastActiveAt.toISOString() : u.lastActiveAt,
      })
    );

    return wrapList(items, nextCursor);
  }
}
