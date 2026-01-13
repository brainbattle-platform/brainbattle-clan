import { IsEnum } from 'class-validator';

export enum ReportStatus {
  OPEN = 'open',
  RESOLVED = 'resolved',
  INVALID = 'invalid',
}

/**
 * DTO để update status report
 * Admin only
 */
export class UpdateReportStatusDto {
  @IsEnum(ReportStatus)
  status: ReportStatus;
}
