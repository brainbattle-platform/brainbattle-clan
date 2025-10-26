import { Controller, Post, Delete, Get, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt.guard';
import { SocialService } from './social.service';

@UseGuards(JwtAuthGuard)
@Controller('v1/social')
export class SocialController {
  constructor(private service: SocialService) {}
  @Post('follows/:userId') follow(@Req() req, @Param('userId') uid: string) { return this.service.follow(req.user.id, uid); }
  @Delete('follows/:userId') unfollow(@Req() req, @Param('userId') uid: string) { return this.service.unfollow(req.user.id, uid); }
  @Get('follows/mutual/:userId') mutual(@Req() req, @Param('userId') uid: string) { return this.service.isMutual(req.user.id, uid); }
  @Post('blocks/:userId') block(@Req() req, @Param('userId') uid: string) { return this.service.block(req.user.id, uid); }
  @Delete('blocks/:userId') unblock(@Req() req, @Param('userId') uid: string) { return this.service.unblock(req.user.id, uid); }
}
