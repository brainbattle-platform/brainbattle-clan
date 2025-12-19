import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CommunityService } from './community.service';

@ApiTags('Internal Clan')
@Controller('internal/clans')
export class CommunityInternalController {
  constructor(private readonly service: CommunityService) {}

  @Get(':clanId/lite')
  lite(@Param('clanId') clanId: string) {
    return this.service.getClanLite(clanId);
  }

  @Get(':clanId/membership')
  membership(@Param('clanId') clanId: string, @Query('userId') userId: string) {
    return this.service.getMembership(clanId, userId);
  }
}
