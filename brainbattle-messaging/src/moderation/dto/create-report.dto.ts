import { IsNotEmpty, IsString } from 'class-validator';

export class CreateDmReportDto {
  @IsString()
  @IsNotEmpty()
  messageId: string;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
