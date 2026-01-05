import { Controller, Get, Post, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { HttpJwtGuard } from 'src/security/http-jwt.guard';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth('access-token')
@UseGuards(HttpJwtGuard)
@Controller('/v1/notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  async list(@Req() req: any, @Query('limit') limit?: string) {
    const userId = req.user.id as string;
    return this.notifications.list(userId, limit ? Number(limit) : 50);
  }

  @Post(':id/read')
  async read(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.id as string;
    return this.notifications.markRead(userId, id);
  }
}
