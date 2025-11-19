import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateThreadSettingsDto {
  @IsOptional()
  @IsString()
  mutedUntil?: string | null;

  @IsOptional()
  @IsBoolean()
  pinned?: boolean;

  @IsOptional()
  @IsBoolean()
  archived?: boolean;
}
