import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtGuard } from '../security/jwt.guard';
import { ModerationService } from './moderation.service';
import { CreateReportDto } from './dto/create-report.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';

type AuthedRequest = Request & { user?: unknown };

@UseGuards(JwtGuard)
@Controller('v1/reports')
export class ModerationController {
  constructor(private service: ModerationService) {}

  @Post()
  create(@Req() req: AuthedRequest, @Body() dto: CreateReportDto) {
    return this.service.create(dto, (req.user as { id: string }).id);
  }

  @Patch(':id')
  resolve(@Param('id') id: string, @Body() dto: ResolveReportDto) {
    return this.service.resolve(id, dto.status);
  }

  @Get()
  list() {
    return this.service.list();
  }
}
