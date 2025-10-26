import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt.guard';
import { CommunityService } from './community.service';

@UseGuards(JwtAuthGuard)
@Controller('v1/clans')
export class CommunityController {
  constructor(private service: CommunityService) {}
  @Post() create(@Req() req, @Body() dto: { name: string; visibility: 'public'|'private' }) { return this.service.createClan(req.user.id, dto); }
  @Get(':id') get(@Param('id') id: string) { return this.service.getClan(id); }
  @Get(':id/members') members(@Param('id') id: string) { return this.service.listMembers(id); }
  @Post(':id/join-requests') requestJoin(@Req() req, @Param('id') id: string) { return this.service.requestJoin(req.user.id, id); }
  @Post(':id/members') approve(@Req() req, @Param('id') id: string, @Body() dto: { userId: string }) { return this.service.approveJoin(req.user.id, id, dto.userId); }
  @Delete(':id/members/:userId') kick(@Req() req, @Param('id') id: string, @Param('userId') userId: string) { return this.service.kick(req.user.id, id, userId); }
}
