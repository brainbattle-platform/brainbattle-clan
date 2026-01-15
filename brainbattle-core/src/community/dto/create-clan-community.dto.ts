import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, IsIn, IsOptional, IsArray } from 'class-validator';

/**
 * Extended DTO for creating clans via /community/clans endpoint
 * Includes fields expected by Flutter frontend
 */
export class CreateClanCommunityDto {
  @ApiProperty({ 
    description: 'Name of the clan',
    example: 'BrainBattle Vietnam',
    minLength: 3,
    maxLength: 50,
  })
  @IsString()
  @MinLength(3)
  name!: string;

  @ApiProperty({ 
    description: 'Visibility level of the clan',
    enum: ['public', 'private'],
    example: 'public',
  })
  @IsIn(['public', 'private'])
  visibility!: 'public' | 'private';

  @ApiProperty({ 
    description: 'Description of the clan',
    example: 'A community for Vietnamese BrainBattle players',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ 
    description: 'Avatar URL for the clan',
    example: 'https://example.com/avatar.png',
    required: false,
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiProperty({ 
    description: 'List of member IDs to add to the clan',
    example: ['user-id-1', 'user-id-2'],
    required: false,
    type: [String],
    maxItems: 50,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  memberIds?: string[];
}
