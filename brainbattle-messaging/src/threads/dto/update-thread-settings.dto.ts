import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateThreadSettingsDto {
  @IsOptional()
  @IsBoolean()
  muted?: boolean;

  @IsOptional()
  @IsBoolean()
  pinned?: boolean;

  @IsOptional()
  @IsBoolean()
  archived?: boolean;
}
