import { Body, Controller, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtHttpGuard } from '../common/jwt.http-guard';
import { PrismaService } from '../prisma/prisma.service';

@UseGuards(JwtHttpGuard)
@Controller('v1/reports')
export class ModerationController {
  constructor(private prisma: PrismaService) {}

  @Post()
  create(@Req() req, @Body() body: { messageId: string; reason: string }) {
    return this.prisma.dMReport.create({
      data: { messageId: body.messageId, reporterId: req.user.id, reason: body.reason },
    });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: { status: 'OPEN'|'RESOLVED'|'REJECTED' }) {
    return this.prisma.dMReport.update({ where: { id }, data: { status: body.status } });
  }
}
