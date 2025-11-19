import { Body, Controller, Get, Param, Post, Query, Req, UseGuards, Patch } from '@nestjs/common';
import { JwtHttpGuard } from '../common/jwt.http-guard';
import { ThreadsService } from './threads.service';
import { CreateOneToOneDto } from './dto/create-one-to-one.dto';
import { HistoryQueryDto } from './dto/history-query.dto';
import { UpdateThreadSettingsDto } from './dto/update-thread-settings.dto';
import { SearchMessagesDto } from './dto/search-messages.dto';
import { ParseIntPipe } from '@nestjs/common';

@UseGuards(JwtHttpGuard)
@Controller('v1/threads')
export class ThreadsController {
  constructor(private svc: ThreadsService) { }

  @Post('one-to-one')
  createOneToOne(@Req() req, @Body() dto: CreateOneToOneDto) {
    return this.svc.createOneToOne(req.user.id, dto.peerId);
  }

  @Get(':id/participants')
  participants(@Req() req, @Param('id') id: string) {
    return this.svc.getParticipants(req.user.id, id);
  }

  @Get(':id/messages')
  history(
    @Req() req,
    @Param('id') id: string,
    @Query('cursor') cursor?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 30,
  ) {
    return this.svc.getHistory(req.user.id, id, limit, cursor);
  }

  @Get(':id/messages/search')
  search(
    @Req() req,
    @Param('id') id: string,
    @Query() query: SearchMessagesDto,
  ) {
    return this.svc.searchMessages(req.user.id, id, query);
  }


  @Post('clan')
  createClan(@Req() req, @Body() body: { clanId: string }) {
    return this.svc.createClanThread(req.user.id, body.clanId);
  }

  @Get('/clans/:clanId/thread')
  getClanThread(@Req() req, @Param('clanId') clanId: string) {
    return this.svc.getOrCreateClanThread(req.user.id, clanId);
  }


  @Patch(':id/settings')
  updateSettings(@Req() req, @Param('id') id: string, @Body() dto: { mutedUntil?: string; pinned?: boolean; archived?: boolean }) {
    return this.svc.updateSettings(req.user.id, id, dto);
  }


}
