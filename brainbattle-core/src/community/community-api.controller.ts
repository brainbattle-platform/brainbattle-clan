import { Body, Controller, Post, Headers } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CommunityService } from './community.service';
import { CreateClanCommunityDto } from './dto/create-clan-community.dto';
import { wrapSuccess } from '../shared/response.helper';
import { firstValueFrom } from 'rxjs';

@ApiTags('Community API')
@Controller('community')
export class CommunityApiController {
  private readonly messagingBaseUrl: string;

  constructor(
    private readonly communityService: CommunityService,
    private readonly httpService: HttpService,
  ) {
    this.messagingBaseUrl =
      process.env.MESSAGING_BASE_URL || 'http://localhost:3001';
  }

  @ApiOperation({ summary: 'Create clan (community endpoint)' })
  @Post('clans')
  async createClan(
    @Headers('x-user-id') userId: string | undefined,
    @Body() dto: CreateClanCommunityDto,
  ) {
    const currentUserId = userId || 'me';

    // Create clan using existing service
    const clan = await this.communityService.createClan(currentUserId, {
      name: dto.name,
      visibility: dto.visibility,
    });

    // Build clan response matching contract
    const clanResponse = {
      id: clan.id,
      name: clan.name,
      description: dto.description || null,
      avatarUrl: dto.avatarUrl || null,
      createdAt: clan.createdAt instanceof Date ? clan.createdAt.toISOString() : clan.createdAt,
      createdBy: {
        id: currentUserId,
        name: 'You',
        avatarUrl: 'https://i.pravatar.cc/150?img=3',
      },
      memberIds: [currentUserId, ...(dto.memberIds || [])],
      memberCount: 1 + (dto.memberIds?.length || 0),
    };

    // Create real conversation in messaging service
    let threadResponse;
    try {
      const messagingResponse = await firstValueFrom(
        this.httpService.post(
          `${this.messagingBaseUrl}/internal/conversations`,
          {
            title: clan.name,
            isClan: true,
            memberIds: [currentUserId, ...(dto.memberIds || [])],
            clanId: clan.id,
          },
        ),
      );

      const conversation = messagingResponse.data;
      threadResponse = {
        id: conversation.id,
        title: conversation.title,
        isClan: conversation.isClan,
        memberCount: conversation.memberCount,
        participants: conversation.participants.map((p: any) => ({
          id: p.id,
          name: p.id === currentUserId ? 'You' : `User ${p.id.slice(0, 4)}`,
          avatarUrl: null,
        })),
      };
    } catch (error) {
      // Fallback to mock thread if messaging service unavailable
      console.error('Failed to create thread in messaging service:', error.message);
      threadResponse = {
        id: `thread_${clan.id}`,
        title: clan.name,
        isClan: true,
        memberCount: clanResponse.memberCount,
        participants: [
          { id: currentUserId, name: 'You', avatarUrl: 'https://i.pravatar.cc/150?img=3' },
          ...(dto.memberIds || []).map((memberId, idx) => ({
            id: memberId,
            name: `User ${idx + 2}`,
            avatarUrl: `https://i.pravatar.cc/150?img=${idx + 5}`,
          })),
        ],
      };
    }

    return wrapSuccess({
      clan: clanResponse,
      thread: threadResponse,
    });
  }
}
