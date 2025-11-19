import { IsEnum } from 'class-validator';
import { ReportStatus } from '@prisma/client';

export class ResolveDmReportDto {
  @IsEnum(ReportStatus)
  status: ReportStatus;
}