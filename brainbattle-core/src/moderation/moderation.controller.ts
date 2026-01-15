import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '../security/jwt.guard';
import { ModerationService } from './moderation.service';
import { CreateReportDto } from './dto/create-report.dto';
import { ResolveReportDto } from './dto/resolve-report.dto';

@ApiTags('Reports')
@ApiBearerAuth('access-token')
@UseGuards(JwtGuard)
@Controller('v1/reports')
export class ModerationController {
  constructor(private service: ModerationService) {}

  @ApiOperation({ summary: 'Create report' })
  @Post()
  create(@Req() req: any, @Body() dto: CreateReportDto) {
    return this.service.create(dto, req.user.id);
  }

  @ApiOperation({ summary: 'List my reports' })
  @Get('my-reports')
  listMine(@Req() req: any, @Query('skip') skip?: number, @Query('take') take?: number) {
    return this.service.listMine(req.user.id, skip, take);
  }

  @ApiOperation({ summary: 'List all reports (admin only)' })
  @Get()
  listAll(
    @Query('skip') skip?: number,
    @Query('take') take?: number,
    @Query('status') status?: string,
    @Query('subjectType') subjectType?: string,
  ) {
    return this.service.listAll(skip, take, status, subjectType);
  }

  @ApiOperation({ summary: 'Get report details' })
  @Get(':id')
  getReport(@Param('id') id: string, @Req() req: any) {
    return this.service.getReport(id, req.user.id);
  }

  @ApiOperation({ summary: 'Resolve report (admin only)' })
  @Patch(':id')
  resolve(@Param('id') id: string, @Body() dto: ResolveReportDto) {
    return this.service.resolve(id, dto.status);
  }
}

