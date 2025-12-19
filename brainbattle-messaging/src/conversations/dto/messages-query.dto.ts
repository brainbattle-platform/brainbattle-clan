import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class MessagesQueryDto {
  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 30;

  @ApiPropertyOptional({ description: 'Cursor messageId (load older than this)' })
  @IsOptional()
  @IsString()
  cursor?: string;
}
