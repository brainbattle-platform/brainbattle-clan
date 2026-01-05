import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '../security/jwt.guard';
import { CommunityService } from './community.service';
import { CreateClanDto } from './dto/create-clan.dto';
import { ApproveJoinDto } from './dto/approve-join.dto';

@ApiTags('Clan')
@ApiBearerAuth('access-token')
@UseGuards(JwtGuard)
@Controller('v1/clans')
export class CommunityController {
  constructor(private readonly service: CommunityService) {}

  @ApiOperation({ summary: 'Create clan' })
  @Post()
  create(@Req() req: any, @Body() dto: CreateClanDto) {
    return this.service.createClan(req.user.id, dto);
  }

  @ApiOperation({ summary: 'Get clan detail' })
  @Get(':clanId')
  get(@Param('clanId') clanId: string) {
    return this.service.getClan(clanId);
  }

  @ApiOperation({ summary: 'List members' })
  @Get(':clanId/members')
  members(@Param('clanId') clanId: string) {
    return this.service.listMembers(clanId);
  }

  @ApiOperation({ summary: 'Join clan (public auto-join, private -> request)' })
  @Post(':clanId/join')
  join(@Req() req: any, @Param('clanId') clanId: string) {
    return this.service.requestJoin(req.user.id, clanId);
  }

  @ApiOperation({ summary: 'Approve join request (leader only)' })
  @Post(':clanId/approve')
  approve(@Req() req: any, @Param('clanId') clanId: string, @Body() dto: ApproveJoinDto) {
    return this.service.approveJoin(req.user.id, clanId, dto.userId);
  }

  @ApiOperation({ summary: 'Leave clan' })
  @Post(':clanId/leave')
  leave(@Req() req: any, @Param('clanId') clanId: string) {
    return this.service.leaveClan(req.user.id, clanId);
  }

  @ApiOperation({ summary: 'Ban member (leader only)' })
  @ApiParam({ name: 'userId', description: 'Target member userId' })
  @Post(':clanId/ban/:userId')
  ban(@Req() req: any, @Param('clanId') clanId: string, @Param('userId') userId: string) {
    return this.service.banMember(req.user.id, clanId, userId);
  }
}
