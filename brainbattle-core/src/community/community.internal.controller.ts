import { Controller, Get, Param } from '@nestjs/common';
import { CommunityService } from './community.service';

@Controller('v1/internal/clans')
export class CommunityInternalController {
  constructor(private readonly service: CommunityService) {}

  @Get(':clanId/members/:userId')
  getMembership(
    @Param('clanId') clanId: string,
    @Param('userId') userId: string,
  ) {
    return this.service.getMembership(clanId, userId);
  }

  @Get(':clanId/lite')
  getLite(@Param('clanId') clanId: string) {
    return this.service.getClanLite(clanId);
  }
}
