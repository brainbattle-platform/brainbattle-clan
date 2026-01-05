import {
  Controller,
  Delete,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtGuard } from '../security/jwt.guard';
import { SocialService } from './social.service';

@ApiTags('Social')
@UseGuards(JwtGuard)
@Controller('v1/social')
export class SocialController {
  constructor(private readonly service: SocialService) {}

  @ApiOperation({ summary: 'Follow a user' })
  @ApiParam({ name: 'userId', description: 'Target user id' })
  @ApiResponse({ status: 200, description: 'Followed (idempotent)' })
  @Post('follows/:userId')
  @ApiBearerAuth('access-token')
  follow(@Req() req: any, @Param('userId') userId: string) {
    return this.service.follow(req.user.id, userId);
  }

  @ApiOperation({ summary: 'Unfollow a user' })
  @ApiParam({ name: 'userId', description: 'Target user id' })
  @ApiResponse({ status: 200, description: 'Unfollowed (idempotent)' })
  @Delete('follows/:userId')
  @ApiBearerAuth('access-token')
  unfollow(@Req() req: any, @Param('userId') userId: string) {
    return this.service.unfollow(req.user.id, userId);
  }

  @ApiOperation({
    summary: 'Block a user (also removes follow edges both ways)',
  })
  @ApiParam({ name: 'userId', description: 'Target user id' })
  @ApiResponse({ status: 200, description: 'Blocked (idempotent)' })
  @Post('blocks/:userId')
  @ApiBearerAuth('access-token')
  block(@Req() req: any, @Param('userId') userId: string) {
    return this.service.block(req.user.id, userId);
  }

  @ApiOperation({ summary: 'Unblock a user' })
  @ApiParam({ name: 'userId', description: 'Target user id' })
  @ApiResponse({ status: 200, description: 'Unblocked (idempotent)' })
  @Delete('blocks/:userId')
  @ApiBearerAuth('access-token')
  unblock(@Req() req: any, @Param('userId') userId: string) {
    return this.service.unblock(req.user.id, userId);
  }
}
