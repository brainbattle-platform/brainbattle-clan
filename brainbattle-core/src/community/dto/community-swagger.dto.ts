import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================================================
// BASE DTOs (shared with messaging)
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
}

export class ThreadDto {
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

  @ApiProperty({ example: 'Clan conversation created' })
  lastMessagePreview: string;

  @ApiProperty({ example: '2026-01-14T12:00:00.000Z' })
  lastMessageAt: string;

  @ApiProperty({ example: 0 })
  unreadCount: number;

  @ApiProperty({ type: [UserLiteDto] })
  participants: UserLiteDto[];
}

export class ClanDto {
  @ApiProperty({ example: 'clan_abc123' })
  id: string;

  @ApiProperty({ example: 'Engineering Team' })
  name: string;

  @ApiProperty({ example: 'engineering-team-xy12' })
  slug: string;

  @ApiPropertyOptional({ example: 'Backend engineers collaboration space' })
  description?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.png', nullable: true })
  avatarUrl?: string | null;

  @ApiProperty({ enum: ['public', 'private'], example: 'private' })
  visibility: 'public' | 'private';

  @ApiProperty({ example: '2026-01-14T12:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ type: UserLiteDto })
  createdBy: UserLiteDto;

  @ApiProperty({ type: [String], example: ['user_alice', 'user_bob'] })
  memberIds: string[];

  @ApiProperty({ example: 3 })
  memberCount: number;
}

// ============================================================================
// REQUEST DTOs
// ============================================================================

export class CreateClanRequestDto {
  @ApiProperty({ example: 'Engineering Team', minLength: 3, maxLength: 50 })
  name: string;

  @ApiPropertyOptional({ example: 'Backend engineers collaboration', maxLength: 500 })
  description?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.png' })
  avatarUrl?: string;

  @ApiProperty({ type: [String], example: ['user_bob', 'user_charlie'], maxItems: 50 })
  memberIds: string[];

  @ApiPropertyOptional({ enum: ['public', 'private'], example: 'private' })
  visibility?: 'public' | 'private';
}

// ============================================================================
// RESPONSE WRAPPERS
// ============================================================================

export class ClanCreateDataDto {
  @ApiProperty({ type: () => ClanDto })
  clan: ClanDto;

  @ApiProperty({ type: () => ThreadDto })
  thread: ThreadDto;
}

export class ClanCreateResponseDto {
  @ApiProperty({ 
    type: () => ClanCreateDataDto,
    example: {
      clan: {
        id: 'clan_abc123',
        name: 'Engineering Team',
        slug: 'engineering-team-xy12',
        description: 'Backend engineers',
        visibility: 'private',
        createdAt: '2026-01-14T12:00:00.000Z',
        createdBy: { id: 'user_alice', name: 'Alice', avatarUrl: null },
        memberIds: ['user_alice', 'user_bob'],
        memberCount: 2,
      },
      thread: {
        id: 'conv_xyz789',
        title: 'Engineering Team',
        isClan: true,
        memberCount: 2,
        lastMessagePreview: 'Clan created',
        lastMessageAt: '2026-01-14T12:00:00.000Z',
        unreadCount: 0,
        participants: [],
      },
    },
  })
  data: ClanCreateDataDto;

  @ApiProperty({ example: {} })
  meta: Record<string, any>;
}
