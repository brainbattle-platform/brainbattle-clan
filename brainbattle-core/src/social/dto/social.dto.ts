import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class TargetUserParamDto {
  @ApiProperty({ example: 'cku3...userId' })
  @IsString()
  userId!: string;
}

export class PairQueryDto {
  @ApiProperty({ example: 'userAId' })
  @IsString()
  a!: string;

  @ApiProperty({ example: 'userBId' })
  @IsString()
  b!: string;
}
