import { IsIn } from 'class-validator';

export class ResolveReportDto {
  @IsIn(['resolved', 'invalid'])
  status: 'resolved' | 'invalid';
}
