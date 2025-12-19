import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MinLength } from 'class-validator';

export class CreateClanDto {
  @ApiProperty({ example: 'BrainBattle Vietnam' })
  @IsString()
  @MinLength(3)
  name!: string;

  @ApiProperty({ enum: ['public', 'private'], example: 'public' })
  @IsIn(['public', 'private'])
  visibility!: 'public' | 'private';
}
