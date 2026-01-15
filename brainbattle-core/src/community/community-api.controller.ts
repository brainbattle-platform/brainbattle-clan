import {
  Body,
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Query,
  Headers,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  HttpCode,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import {
  ApiOperation,
  ApiTags,
  ApiHeader,
  ApiQuery,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import { CommunityService } from './community.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClanCommunityDto } from './dto/create-clan-community.dto';
import { wrapSuccess, wrapList } from '../shared/response.helper';
import { firstValueFrom } from 'rxjs';
import {
  ClanCreateResponseDto,
  ClanDto,
  ClanListResponseDto,
  ClanMembersListResponseDto,
  ClanMemberLiteDto,
  ClanListDataDto,
  ClanMembersListDataDto,
} from './dto/community-swagger.dto';

@ApiTags('Community')
@Controller('community')
export class CommunityApiController {
  private readonly messagingBaseUrl: string;

  constructor(
    private readonly communityService: CommunityService,
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
  ) {
    this.messagingBaseUrl =
      process.env.MESSAGING_BASE_URL || 'http://messaging:3001';
  }

  @ApiOperation({ summary: 'Create clan', description: 'Create a new clan with initial members and conversation thread' })
  @ApiHeader({ name: 'x-user-id', required: false, description: 'User ID (fallback: "me")' })
  @ApiResponse({ status: 201, type: ClanCreateResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid clan data (name, description, or members)' })
  @HttpCode(201)
  @Post('clans')
  async createClan(
    @Headers('x-user-id') userId: string | undefined,
    @Body() dto: CreateClanCommunityDto,
  ) {
    console.log('[createClan] Request received:', { userId, dto });
    const currentUserId = userId || 'me';

    // Validate clan name
    if (!dto.name || dto.name.trim().length < 3) {
      throw new BadRequestException('Clan name must be at least 3 characters');
    }

    if (dto.name.length > 50) {
      throw new BadRequestException('Clan name must not exceed 50 characters');
    }

    // Validate description length
    if (dto.description && dto.description.length > 500) {
      throw new BadRequestException('Description must not exceed 500 characters');
    }

    // Ensure memberIds includes current user
    const memberIds = dto.memberIds || [];
    if (!memberIds.includes(currentUserId)) {
      memberIds.unshift(currentUserId);
    }

    // Validate member count
    if (memberIds.length > 50) {
      throw new BadRequestException('Cannot create clan with more than 50 initial members');
    }

    console.log('[createClan] Validation passed, creating clan...');

    // Create clan using existing service
    const clan = await this.communityService.createClan(currentUserId, {
      name: dto.name,
      visibility: dto.visibility || 'private',
    });

    console.log('[createClan] Clan created:', clan.id);

    // Update clan with description and avatar if provided
    let updatedClan = clan;
    if (dto.description || dto.avatarUrl) {
      updatedClan = await this.prisma.clan.update({
        where: { id: clan.id },
        data: {
          description: dto.description || null,
          avatarUrl: dto.avatarUrl || null,
        },
      });
      console.log('[createClan] Clan updated with metadata');
    }

    // Add additional members to clan
    const additionalMembers = memberIds.filter((id) => id !== currentUserId);
    if (additionalMembers.length > 0) {
      await this.prisma.clanMember.createMany({
        data: additionalMembers.map((memberId) => ({
          clanId: clan.id,
          userId: memberId,
          role: 'member',
          status: 'active',
        })),
        skipDuplicates: true,
      });
      console.log('[createClan] Members added:', additionalMembers);
    }

    // Build clan response matching contract
    const clanResponse = {
      id: updatedClan.id,
      name: updatedClan.name,
      slug: updatedClan.slug,
      description: dto.description || null,
      avatarUrl: dto.avatarUrl || null,
      visibility: updatedClan.visibility,
      createdAt:
        updatedClan.createdAt instanceof Date
          ? updatedClan.createdAt.toISOString()
          : updatedClan.createdAt,
      createdBy: {
        id: currentUserId,
        handle: currentUserId,
        displayName: 'You',
        avatarUrl: null,
      },
      memberIds,
      memberCount: memberIds.length,
    };

    // Create real conversation in messaging service
    let threadResponse;
    try {
      console.log('[createClan] Calling messaging service at:', this.messagingBaseUrl);
      const messagingResponse = await firstValueFrom(
        this.httpService.post(
          `${this.messagingBaseUrl}/internal/conversations`,
          {
            title: clan.name,
            avatarUrl: dto.avatarUrl,
            isClan: true,
            memberIds,
            clanId: clan.id,
          },
          {
            timeout: 5000,
          },
        ),
      );

      console.log('[createClan] Messaging service response received');
      const conversation = messagingResponse.data.data;
      threadResponse = {
        id: conversation.id,
        title: conversation.title,
        isClan: conversation.isClan,
        clanId: conversation.clanId,
        memberCount: conversation.memberCount,
        avatarUrl: dto.avatarUrl || null,
        lastMessagePreview: 'Clan created',
        lastMessageAt: clanResponse.createdAt,
        unreadCount: 0,
        participants: conversation.participants.map((p: any) => ({
          id: p.id,
          handle: p.id,
          displayName: p.id === currentUserId ? 'You' : `User ${p.id.slice(0, 8)}`,
          avatarUrl: null,
        })),
      };
      console.log('[createClan] Thread response created:', threadResponse.id);
    } catch (error) {
      // Log error but don't fail clan creation
      console.error(
        '[createClan] Failed to create thread in messaging service:',
        error instanceof Error ? error.message : error,
      );

      // Return minimal thread response (conversation creation can be retried later)
      threadResponse = {
        id: `pending_${clan.id}`,
        title: clan.name,
        isClan: true,
        clanId: clan.id,
        memberCount: memberIds.length,
        avatarUrl: dto.avatarUrl || null,
        lastMessagePreview: 'Clan created',
        lastMessageAt: clanResponse.createdAt,
        unreadCount: 0,
        participants: memberIds.map((memberId) => ({
          id: memberId,
          handle: memberId,
          displayName: memberId === currentUserId ? 'You' : `User ${memberId.slice(0, 8)}`,
          avatarUrl: null,
        })),
      };
      console.log('[createClan] Using fallback thread response');
    }

    const result = wrapSuccess({
      clan: clanResponse,
      thread: threadResponse,
    });

    console.log('[createClan] Returning response');
    return result;
  }

  @ApiOperation({ summary: 'List clans for community', description: 'List clans relevant to the current user or discoverable clans' })
  @ApiHeader({ name: 'x-user-id', required: false, description: 'User ID (fallback: "me")' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiQuery({ name: 'q', required: false, type: String })
  @ApiQuery({ name: 'filter', required: false, type: String })
  @ApiResponse({ status: 200, type: ClanListResponseDto })
  @Get('clans')
  async listClans(
    @Headers('x-user-id') userId: string | undefined,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @Query('q') q?: string,
    @Query('filter') filter?: string,
  ) {
    const currentUserId = userId || 'me';
    const limitNum = Math.min(parseInt(limit || '20', 10), 100);

    const cursorObj = cursor
      ? (JSON.parse(Buffer.from(cursor, 'base64').toString('utf8')) as {
          createdAt: string;
          id: string;
        })
      : null;

    const where: any = {};

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' as const } },
        { slug: { contains: q, mode: 'insensitive' as const } },
      ];
    }

    if (filter === 'member') {
      where.members = {
        some: {
          userId: currentUserId,
          status: 'active',
        },
      };
    }

    const orderBy = { createdAt: 'desc' as const };

    const clans = await this.prisma.clan.findMany({
      where,
      orderBy,
      take: limitNum + 1,
      skip: cursorObj
        ? 1
        : 0,
      ...(cursorObj
        ? {
            cursor: {
              id: cursorObj.id,
            },
          }
        : {}),
    });

    const items = clans.slice(0, limitNum).map((c) => this.mapClanToDto(c));

    const hasMore = clans.length > limitNum;
    const nextCursor = hasMore
      ? Buffer.from(
          JSON.stringify({
            createdAt: items[items.length - 1].createdAt,
            id: items[items.length - 1].id,
          }),
        ).toString('base64')
      : null;

    const data: ClanListDataDto = { items };
    return wrapSuccess(data, { nextCursor });
  }

  @ApiOperation({ summary: 'Get clan detail', description: 'Get details of a single clan' })
  @ApiHeader({ name: 'x-user-id', required: false, description: 'User ID (fallback: "me")' })
  @ApiParam({ name: 'clanId', type: String })
  @ApiResponse({ status: 200, type: ClanDto })
  @Get('clans/:clanId')
  async getClan(@Param('clanId') clanId: string) {
    const clan = await this.prisma.clan.findUnique({ where: { id: clanId } });
    if (!clan) {
      throw new NotFoundException('Clan not found');
    }

    return wrapSuccess(this.mapClanToDto(clan));
  }

  @ApiOperation({ summary: 'List clan members', description: 'List members of a clan' })
  @ApiHeader({ name: 'x-user-id', required: false, description: 'User ID (fallback: "me")' })
  @ApiParam({ name: 'clanId', type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiQuery({ name: 'cursor', required: false, type: String })
  @ApiResponse({ status: 200, type: ClanMembersListResponseDto })
  @Get('clans/:clanId/members')
  async listMembers(
    @Param('clanId') clanId: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    const limitNum = Math.min(parseInt(limit || '50', 10), 200);

    const cursorObj = cursor
      ? (JSON.parse(Buffer.from(cursor, 'base64').toString('utf8')) as {
          joinedAt: string;
          userId: string;
        })
      : null;

    const members = await this.prisma.clanMember.findMany({
      where: { clanId, status: 'active' },
      orderBy: { joinedAt: 'asc' as const },
      take: limitNum + 1,
      skip: cursorObj ? 1 : 0,
      ...(cursorObj
        ? {
            cursor: {
              clanId_userId: {
                clanId,
                userId: cursorObj.userId,
              },
            },
          }
        : {}),
      include: {
        clan: false,
      },
    });

    const items: ClanMemberLiteDto[] = members.slice(0, limitNum).map((m) => ({
      id: m.userId,
      handle: m.userId,
      displayName: m.userId,
      avatarUrl: null,
    }));

    const hasMore = members.length > limitNum;
    const last = members[limitNum - 1];
    const nextCursor = hasMore && last
      ? Buffer.from(
          JSON.stringify({
            joinedAt: last.joinedAt.toISOString(),
            userId: last.userId,
          }),
        ).toString('base64')
      : null;

    const data: ClanMembersListDataDto = { items };
    return wrapSuccess(data, { nextCursor });
  }

  @ApiOperation({ summary: 'Update clan settings', description: 'Update clan name/description/avatar (leader only)' })
  @ApiHeader({ name: 'x-user-id', required: false, description: 'User ID (fallback: "me")' })
  @ApiParam({ name: 'clanId', type: String })
  @ApiResponse({ status: 200, type: ClanDto })
  @Patch('clans/:clanId/settings')
  async updateSettings(
    @Headers('x-user-id') userId: string | undefined,
    @Param('clanId') clanId: string,
    @Body() body: { name?: string; description?: string; avatarUrl?: string },
  ) {
    const currentUserId = userId || 'me';

    const clan = await this.prisma.clan.findUnique({ where: { id: clanId } });
    if (!clan) {
      throw new NotFoundException('Clan not found');
    }

    const leader = await this.prisma.clanMember.findUnique({
      where: {
        clanId_userId: {
          clanId,
          userId: currentUserId,
        },
      },
    });

    if (!leader || leader.role !== 'leader' || leader.status !== 'active') {
      throw new ForbiddenException('Only clan leader can update settings');
    }

    const updated = await this.prisma.clan.update({
      where: { id: clanId },
      data: {
        name: body.name ?? clan.name,
        description: body.description ?? clan.description,
        avatarUrl: body.avatarUrl ?? clan.avatarUrl,
      },
    });

    return wrapSuccess(this.mapClanToDto(updated));
  }

  @ApiOperation({ summary: 'Join clan', description: 'Join clan directly or create join request' })
  @ApiHeader({ name: 'x-user-id', required: false, description: 'User ID (fallback: "me")' })
  @ApiParam({ name: 'clanId', type: String })
  @Post('clans/:clanId/join')
  async joinClan(
    @Headers('x-user-id') userId: string | undefined,
    @Param('clanId') clanId: string,
  ) {
    const currentUserId = userId || 'me';
    const result = await this.communityService.requestJoin(currentUserId, clanId);
    const status: 'joined' | 'pending' = result.joined ? 'joined' : 'pending';
    return wrapSuccess({ status });
  }

  @ApiOperation({ summary: 'Leave clan', description: 'Leave clan as current user' })
  @ApiHeader({ name: 'x-user-id', required: false, description: 'User ID (fallback: "me")' })
  @ApiParam({ name: 'clanId', type: String })
  @Post('clans/:clanId/leave')
  async leaveClan(
    @Headers('x-user-id') userId: string | undefined,
    @Param('clanId') clanId: string,
  ) {
    const currentUserId = userId || 'me';
    await this.communityService.leaveClan(currentUserId, clanId);
    return wrapSuccess({ ok: true });
  }

  @ApiOperation({ summary: 'List invite links', description: 'List active invite links for a clan (leader only)' })
  @ApiHeader({ name: 'x-user-id', required: false, description: 'User ID (fallback: "me")' })
  @ApiParam({ name: 'clanId', type: String })
  @Get('clans/:clanId/invite-links')
  async listInviteLinks(
    @Headers('x-user-id') userId: string | undefined,
    @Param('clanId') clanId: string,
  ) {
    const currentUserId = userId || 'me';
    const invites = await this.communityService.listInviteLinks(currentUserId, clanId);
    return wrapSuccess(invites);
  }

  @ApiOperation({ summary: 'Create invite link', description: 'Create a new invite link (leader only)' })
  @ApiHeader({ name: 'x-user-id', required: false, description: 'User ID (fallback: "me")' })
  @ApiParam({ name: 'clanId', type: String })
  @Post('clans/:clanId/invite-links')
  async createInviteLink(
    @Headers('x-user-id') userId: string | undefined,
    @Param('clanId') clanId: string,
    @Body() dto: { maxUses?: number; expiresInMinutes?: number },
  ) {
    const currentUserId = userId || 'me';
    const invite = await this.communityService.createInviteLink(currentUserId, clanId, dto);
    return wrapSuccess(invite);
  }

  @ApiOperation({ summary: 'Join via invite link', description: 'Join clan using invite token' })
  @ApiHeader({ name: 'x-user-id', required: false, description: 'User ID (fallback: "me")' })
  @Post('clans/join/invite')
  async joinViaInvite(
    @Headers('x-user-id') userId: string | undefined,
    @Body() body: { token: string },
  ) {
    const currentUserId = userId || 'me';
    const result = await this.communityService.joinViaInvite(currentUserId, body.token);
    return wrapSuccess(result);
  }

  @ApiOperation({ summary: 'Change member role', description: 'Promote or demote a member (leader only)' })
  @ApiHeader({ name: 'x-user-id', required: false, description: 'User ID (fallback: "me")' })
  @ApiParam({ name: 'clanId', type: String })
  @ApiParam({ name: 'userId', type: String })
  @Post('clans/:clanId/members/:userId/role')
  async changeMemberRole(
    @Headers('x-user-id') userId: string | undefined,
    @Param('clanId') clanId: string,
    @Param('userId') targetUserId: string,
    @Body() body: { role: 'leader' | 'officer' | 'member' },
  ) {
    const currentUserId = userId || 'me';
    const result = await this.communityService.promoteMember(
      currentUserId,
      clanId,
      targetUserId,
      body.role,
    );
    return wrapSuccess(result);
  }

  @ApiOperation({ summary: 'Transfer clan leader', description: 'Transfer leader role to another member' })
  @ApiHeader({ name: 'x-user-id', required: false, description: 'User ID (fallback: "me")' })
  @ApiParam({ name: 'clanId', type: String })
  @ApiParam({ name: 'newLeaderId', type: String })
  @Post('clans/:clanId/transfer-leader/:newLeaderId')
  async transferLeader(
    @Headers('x-user-id') userId: string | undefined,
    @Param('clanId') clanId: string,
    @Param('newLeaderId') newLeaderId: string,
  ) {
    const currentUserId = userId || 'me';
    const result = await this.communityService.transferLeader(currentUserId, clanId, newLeaderId);
    return wrapSuccess(result);
  }

  @ApiOperation({ summary: 'Ban member from clan', description: 'Ban a member from the clan (leader only)' })
  @ApiHeader({ name: 'x-user-id', required: false, description: 'User ID (fallback: "me")' })
  @ApiParam({ name: 'clanId', type: String })
  @ApiParam({ name: 'userId', type: String })
  @Post('clans/:clanId/ban/:userId')
  async banMember(
    @Headers('x-user-id') userId: string | undefined,
    @Param('clanId') clanId: string,
    @Param('userId') targetUserId: string,
  ) {
    const currentUserId = userId || 'me';
    const result = await this.communityService.banMember(currentUserId, clanId, targetUserId);
    return wrapSuccess(result);
  }

  private mapClanToDto(clan: any): ClanDto {
    const memberCount = (clan as any).memberCount ?? undefined;
    return {
      id: clan.id,
      name: clan.name,
      slug: clan.slug,
      description: clan.description ?? undefined,
      avatarUrl: clan.avatarUrl ?? null,
      visibility: clan.visibility as 'public' | 'private',
      createdAt:
        clan.createdAt instanceof Date
          ? clan.createdAt.toISOString()
          : clan.createdAt,
      createdBy: {
        id: clan.createdBy,
        handle: clan.createdBy,
        displayName: clan.createdBy,
        avatarUrl: null,
      },
      memberIds: [],
      memberCount: memberCount ?? 0,
    };
  }
}
