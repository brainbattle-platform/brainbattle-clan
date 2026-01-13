import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '../security/jwt.guard';
import { CommunityService } from './community.service';
import { CreateClanDto } from './dto/create-clan.dto';
import { ApproveJoinDto } from './dto/approve-join.dto';
import { CreateInviteDto } from './dto/create-invite.dto';
import { JoinViaInviteDto } from './dto/join-via-invite.dto';
import { PromoteMemberDto } from './dto/promote-member.dto';
import { UpdateClanSettingsDto } from './dto/update-clan-settings.dto';

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

  /* ================= INVITE LINK ENDPOINTS (SPECIFIC ROUTES FIRST) ================= */

  @ApiOperation({ summary: 'Join clan via invite link' })
  @Post('join/invite')
  joinViaInvite(@Req() req: any, @Body() dto: JoinViaInviteDto) {
    return this.service.joinViaInvite(req.user.id, dto.token);
  }

  /* ================= CLAN DETAIL & SETTINGS (SPECIFIC BEFORE GENERIC) ================= */

  @ApiOperation({ summary: 'Get clan settings' })
  @Get(':clanId/settings')
  getSettings(@Param('clanId') clanId: string) {
    return this.service.getClanSettings(clanId);
  }

  @ApiOperation({ summary: 'Update clan settings (leader only)' })
  @Patch(':clanId/settings')
  updateSettings(
    @Req() req: any,
    @Param('clanId') clanId: string,
    @Body() dto: UpdateClanSettingsDto,
  ) {
    return this.service.updateClanSettings(req.user.id, clanId, dto);
  }

  @ApiOperation({ summary: 'List members' })
  @Get(':clanId/members')
  members(@Param('clanId') clanId: string) {
    return this.service.listMembers(clanId);
  }

  @ApiOperation({ summary: 'List invite links (leader only)' })
  @Get(':clanId/invite-links')
  listInviteLinks(@Req() req: any, @Param('clanId') clanId: string) {
    return this.service.listInviteLinks(req.user.id, clanId);
  }

  @ApiOperation({ summary: 'Create new invite link (leader only)' })
  @Post(':clanId/invite-links')
  createInviteLink(
    @Req() req: any,
    @Param('clanId') clanId: string,
    @Body() dto: CreateInviteDto,
  ) {
    return this.service.createInviteLink(req.user.id, clanId, dto);
  }

  @ApiOperation({ summary: 'Reset invite link - revoke all old, create new (leader only)' })
  @Post(':clanId/invite-links/reset')
  resetInviteLink(@Req() req: any, @Param('clanId') clanId: string) {
    return this.service.resetInviteLink(req.user.id, clanId);
  }

  @ApiOperation({ summary: 'Revoke invite link (leader only)' })
  @Delete(':clanId/invite-links/:inviteId')
  revokeInviteLink(
    @Req() req: any,
    @Param('clanId') clanId: string,
    @Param('inviteId') inviteId: string,
  ) {
    return this.service.revokeInviteLink(req.user.id, clanId, inviteId);
  }

  @ApiOperation({ summary: 'Promote/Demote member (leader only)' })
  @Post(':clanId/members/:userId/role')
  promoteMember(
    @Req() req: any,
    @Param('clanId') clanId: string,
    @Param('userId') userId: string,
    @Body() dto: PromoteMemberDto,
  ) {
    return this.service.promoteMember(req.user.id, clanId, userId, dto.role);
  }

  @ApiOperation({ summary: 'Transfer leader to another member (leader only)' })
  @Post(':clanId/transfer-leader/:newLeaderId')
  transferLeader(
    @Req() req: any,
    @Param('clanId') clanId: string,
    @Param('newLeaderId') newLeaderId: string,
  ) {
    return this.service.transferLeader(req.user.id, clanId, newLeaderId);
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

  @ApiOperation({ summary: 'Get clan detail' })
  @Get(':clanId')
  get(@Param('clanId') clanId: string) {
    return this.service.getClan(clanId);
  }
}
