import { IsInt, IsOptional, IsString } from 'class-validator';
export class HistoryQueryDto {
  @IsOptional() @IsString() cursor?: string;
  @IsOptional() @IsInt() limit?: number;
}
