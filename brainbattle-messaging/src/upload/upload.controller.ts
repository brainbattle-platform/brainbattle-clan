import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtHttpGuard } from '../common/jwt.http-guard';
import { UploadService } from './upload.service';
import { PresignDto } from './dto/presign.dto';

@UseGuards(JwtHttpGuard)
@Controller('v1/upload')
export class UploadController {
  constructor(private readonly svc: UploadService) {}

  @Get('presign')
async presign(@Req() req, @Query() query: PresignDto) {
  const type = query.kind ?? 'file';
  const ext = query.kind ?? 'bin';
  const size = query.size;

  return this.svc.presign(req.user.id, type, ext, size);
}

}
