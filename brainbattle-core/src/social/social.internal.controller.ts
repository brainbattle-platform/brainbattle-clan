import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SocialService } from './social.service';

@ApiTags('Internal Social')
@Controller('internal/social')
export class SocialInternalController {
  constructor(private readonly service: SocialService) {}

  @ApiOperation({ summary: 'Health check' })
  @Get('health')
  health() {
    return { ok: true };
  }

  /**
   * Optional but useful:
   * messaging có thể gọi kiểm tra quan hệ (debug / ensure)
   */
  @ApiOperation({ summary: 'Get relation between two users' })
  @Get('relation')
  relation(@Query('a') a: string, @Query('b') b: string) {
    return this.service.relation(a, b);
  }
}
