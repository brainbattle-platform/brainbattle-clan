import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtHttpGuard } from '../common/jwt.http-guard';
import { UploadService } from './upload.service';

@UseGuards(JwtHttpGuard)
@Controller('v1/upload')
export class UploadController {
  constructor(private up: UploadService) {}
  @Get('presign')
  presign(@Req() req, @Query('type') type: string, @Query('ext') ext?: string, @Query('size') size?: string) {
    return this.up.presign(req.user.id, type, ext, size ? +size : undefined);
  }
}
