import {
  Body,
  Controller,
  Post,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import {
  ApiOperation,
  ApiTags,
  ApiHeader,
  ApiResponse,
} from '@nestjs/swagger';
import { CommunityService } from './community.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClanCommunityDto } from './dto/create-clan-community.dto';
import { wrapSuccess } from '../shared/response.helper';
import { firstValueFrom } from 'rxjs';
import { ClanCreateResponseDto } from './dto/community-swagger.dto';

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
  @Post('clans')
  async createClan(
    @Headers('x-user-id') userId: string | undefined,
    @Body() dto: CreateClanCommunityDto,
  ) {
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

    // Create clan using existing service
    const clan = await this.communityService.createClan(currentUserId, {
      name: dto.name,
      visibility: dto.visibility || 'private',
    });

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
    } catch (error) {
      // Log error but don't fail clan creation
      console.error(
        'Failed to create thread in messaging service:',
        error.message,
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
    }

    return wrapSuccess({
      clan: clanResponse,
      thread: threadResponse,
    });
  }
}
