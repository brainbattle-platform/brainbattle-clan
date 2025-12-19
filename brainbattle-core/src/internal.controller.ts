import { Controller, Get, Param } from '@nestjs/common';
import { SocialService } from './social/social.service';
import { CommunityService } from './community/community.service';

@Controller('internal')
export class InternalController {
  constructor(
    private readonly social: SocialService,
    private readonly community: CommunityService,
  ) {}

  @Get('users/:me/blocked/:target')
  async isBlocked(
    @Param('me') me: string,
    @Param('target') target: string,
  ) {
    const blocked = await this.social.isBlocked(me, target);
    return { blocked };
  }

  @Get('clans/:clanId/members/:userId')
  async isMember(
    @Param('clanId') clanId: string,
    @Param('userId') userId: string,
  ) {
    const member = await this.community.isMember(userId, clanId);
    return { member };
  }
}
