import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtHttpGuard } from '../common/jwt.http-guard';
import { ModerationService } from './moderation.service';
import { CreateDmReportDto } from './dto/create-report.dto';
import { ResolveDmReportDto } from './dto/resolve-report.dto';

@UseGuards(JwtHttpGuard)
@Controller('v1/reports')
export class ModerationController {
  constructor(private service: ModerationService) {}

  @Post()
  create(@Req() req, @Body() dto: CreateDmReportDto) {
    return this.service.create(dto, req.user.id);
  }

  @Patch(':id')
  resolve(@Param('id') id: string, @Body() dto: ResolveDmReportDto) {
    return this.service.resolve(id, dto);
  }

  @Get()
  list() {
    return this.service.list();
  }
}
