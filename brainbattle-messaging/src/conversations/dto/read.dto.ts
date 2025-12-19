import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ReadDto {
  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  @IsString()
  lastReadAt!: string;
}
