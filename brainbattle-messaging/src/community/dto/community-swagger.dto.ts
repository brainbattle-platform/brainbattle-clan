import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================================================
// BASE DTOs
// ============================================================================

export class UserLiteDto {
  @ApiProperty({ example: 'user_alice' })
  id: string;

  @ApiProperty({ example: 'user_alice' })
  handle: string;

  @ApiProperty({ example: 'Alice' })
  displayName: string;

  @ApiPropertyOptional({ example: null, nullable: true })
  avatarUrl?: string | null;

  @ApiPropertyOptional({ example: true })
  isActiveNow?: boolean;

  @ApiPropertyOptional({ example: '2026-01-14T12:00:00.000Z' })
  lastActiveAt?: string;
}

export class AttachmentDto {
  @ApiProperty({ example: 'att_001' })
  id: string;

  @ApiProperty({ enum: ['image', 'file', 'link'], example: 'image' })
  type: 'image' | 'file' | 'link';

  @ApiProperty({ example: 'https://cdn.example.com/file.png' })
  url: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/thumb.png', nullable: true })
  thumbnailUrl?: string | null;

  @ApiPropertyOptional({ example: 'file.png', nullable: true })
  fileName?: string | null;

  @ApiProperty({ example: 524288 })
  sizeBytes: number;

  @ApiProperty({ example: 'image/png' })
  mimeType: string;

  @ApiPropertyOptional({ example: 1920 })
  width?: number;

  @ApiPropertyOptional({ example: 1080 })
  height?: number;
}

export class ThreadLiteDto {
  @ApiProperty({ example: 'conv_xyz789' })
  id: string;

  @ApiProperty({ example: 'Engineering Team' })
  title: string;

  @ApiProperty({ example: true })
  isClan: boolean;

  @ApiProperty({ example: 3 })
  memberCount: number;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.png', nullable: true })
  avatarUrl?: string | null;

  @ApiProperty({ example: 'Last message preview' })
  lastMessagePreview: string;

  @ApiProperty({ example: '2026-01-14T12:00:00.000Z' })
  lastMessageAt: string;

  @ApiProperty({ example: 0 })
  unreadCount: number;

  @ApiProperty({ type: [UserLiteDto] })
  participants: UserLiteDto[];
}

export class ThreadDto extends ThreadLiteDto {
  @ApiPropertyOptional({ example: 'Seen by Alice, Bob', nullable: true })
  seenBySummary?: string | null;
}

export class MessageDto {
  @ApiProperty({ example: 'msg_001' })
  id: string;

  @ApiProperty({ example: 'conv_xyz789' })
  conversationId: string;

  @ApiProperty({ type: UserLiteDto, nullable: true })
  sender: UserLiteDto | null;

  @ApiPropertyOptional({ example: 'Hello team!' })
  text?: string;

  @ApiProperty({ type: [AttachmentDto] })
  attachments: AttachmentDto[];

  @ApiProperty({ example: '2026-01-14T12:01:00.000Z' })
  createdAt: string;

  @ApiProperty({ enum: ['pending', 'delivered', 'failed'], example: 'delivered' })
  status: 'pending' | 'delivered' | 'failed';

  @ApiProperty({ type: [UserLiteDto] })
  readBy: UserLiteDto[];
}

// ============================================================================
// REQUEST DTOs
// ============================================================================

export class AttachmentInputDto {
  @ApiProperty({ enum: ['image', 'file', 'link'], example: 'image' })
  type: 'image' | 'file' | 'link';

  @ApiProperty({ example: 'https://cdn.example.com/file.png' })
  url: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/thumb.png' })
  thumbnailUrl?: string;

  @ApiPropertyOptional({ example: 'file.png' })
  fileName?: string;

  @ApiPropertyOptional({ example: 524288 })
  sizeBytes?: number;

  @ApiPropertyOptional({ example: 'image/png' })
  mimeType?: string;

  @ApiPropertyOptional({ example: 1920 })
  width?: number;

  @ApiPropertyOptional({ example: 1080 })
  height?: number;
}

export class SendMessageRequestDto {
  @ApiPropertyOptional({ example: 'Hello team!', maxLength: 10000 })
  text?: string;

  @ApiPropertyOptional({ type: [AttachmentInputDto] })
  attachments?: AttachmentInputDto[];
}

export class CreateConversationRequestDto {
  @ApiPropertyOptional({ example: 'clan_xyz' })
  clanId?: string;

  @ApiPropertyOptional({ example: 'Engineering Team' })
  title?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.png' })
  avatarUrl?: string;

  @ApiProperty({ example: true })
  isClan: boolean;

  @ApiProperty({ type: [String], example: ['user_alice', 'user_bob'] })
  memberIds: string[];
}

// ============================================================================
// RESPONSE WRAPPERS (concrete for OpenAPI)
// ============================================================================

export class ThreadsListResponseDto {
  @ApiProperty({
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: { type: 'object' },
      },
    },
    example: {
      items: [
        {
          id: 'conv_xyz789',
          title: 'Engineering Team',
          isClan: true,
          memberCount: 3,
          lastMessagePreview: 'Hello team!',
          lastMessageAt: '2026-01-14T12:00:00.000Z',
          unreadCount: 0,
          participants: [],
        },
      ],
    },
  })
  data: { items: ThreadLiteDto[] };

  @ApiProperty({
    type: 'object',
    properties: {
      nextCursor: { type: 'string', nullable: true },
    },
    example: { nextCursor: null },
  })
  meta: { nextCursor: string | null };
}

export class ThreadResponseDto {
  @ApiProperty({ type: ThreadDto })
  data: ThreadDto;

  @ApiProperty({ example: {} })
  meta: Record<string, any>;
}

export class MessagesListResponseDto {
  @ApiProperty({
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: { type: 'object' },
      },
    },
    example: {
      items: [
        {
          id: 'msg_001',
          conversationId: 'conv_xyz789',
          sender: { id: 'user_alice', name: 'Alice', avatarUrl: null },
          text: 'Hello team!',
          attachments: [],
          createdAt: '2026-01-14T12:01:00.000Z',
          status: 'delivered',
          readBy: [],
        },
      ],
    },
  })
  data: { items: MessageDto[] };

  @ApiProperty({
    type: 'object',
    properties: {
      nextCursor: { type: 'string', nullable: true },
    },
    example: { nextCursor: null },
  })
  meta: { nextCursor: string | null };
}

export class MessageResponseDto {
  @ApiProperty({ type: MessageDto })
  data: MessageDto;

  @ApiProperty({ example: {} })
  meta: Record<string, any>;
}

export class MarkReadResponseDto {
  @ApiProperty({
    type: 'object',
    properties: {
      unreadCount: { type: 'number' },
      markedAt: { type: 'string' },
    },
    example: {
      unreadCount: 0,
      markedAt: '2026-01-14T12:03:00.000Z',
    },
  })
  data: { unreadCount: number; markedAt: string };

  @ApiProperty({ example: {} })
  meta: Record<string, any>;
}

export class ActiveUsersListResponseDto {
  @ApiProperty({
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: { type: 'object' },
      },
    },
    example: {
      items: [
        {
          id: 'user_alice',
          name: 'Alice',
          avatarUrl: null,
          isActiveNow: true,
          lastActiveAt: '2026-01-14T12:03:30.000Z',
        },
      ],
    },
  })
  data: { items: UserLiteDto[] };

  @ApiProperty({
    type: 'object',
    properties: {
      nextCursor: { type: 'string', nullable: true },
    },
    example: { nextCursor: null },
  })
  meta: { nextCursor: string | null };
}
