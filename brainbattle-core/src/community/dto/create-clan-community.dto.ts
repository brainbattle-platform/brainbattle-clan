import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, IsIn, IsOptional, IsArray } from 'class-validator';

/**
 * Extended DTO for creating clans via /community/clans endpoint
 * Includes fields expected by Flutter frontend
 */
export class CreateClanCommunityDto {
  @ApiProperty({ example: 'BrainBattle Vietnam' })
  @IsString()
  @MinLength(3)
  name!: string;

  @ApiProperty({ enum: ['public', 'private'], example: 'public' })
  @IsIn(['public', 'private'])
  visibility!: 'public' | 'private';

  @ApiProperty({ example: 'A community for Vietnamese BrainBattle players', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'https://example.com/avatar.png', required: false })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiProperty({ example: ['user-id-1', 'user-id-2'], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  memberIds?: string[];
}
