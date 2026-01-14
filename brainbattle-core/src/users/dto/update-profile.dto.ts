import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  IsUrl,
} from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  displayName?: string;

  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}
