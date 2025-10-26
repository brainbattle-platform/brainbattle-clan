import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt.guard';
import { ModerationService } from './moderation.service';

@UseGuards(JwtAuthGuard)
@Controller('v1/reports')
export class ModerationController {
  constructor(private service: ModerationService) {}
  @Post() create(@Req() req, @Body() dto: { subjectType: string; subjectId: string; reason: string }) {
    return this.service.create(dto, req.user.id);
  }
  @Patch(':id') resolve(@Param('id') id: string, @Body() dto: { status: 'resolved'|'invalid' }) {
    return this.service.resolve(id, dto.status);
  }
  @Get() list() { return this.service.list(); }
}
