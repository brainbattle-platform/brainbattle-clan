import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ApproveJoinDto {
  @ApiProperty({ example: 'cku...userId' })
  @IsString()
  userId!: string;
}
