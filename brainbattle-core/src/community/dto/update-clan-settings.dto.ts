import { IsOptional, IsString, Length, IsUrl } from 'class-validator';

/**
 * DTO để cập nhật cài đặt clan
 * Leader only
 */
export class UpdateClanSettingsDto {
  @IsOptional()
  @IsString()
  @Length(10, 500)
  description?: string;

  @IsOptional()
  @IsUrl()
  coverUrl?: string;

  @IsOptional()
  @IsString()
  @Length(0, 1000)
  rules?: string; // Nội quy clan

  @IsOptional()
  @IsString()
  @Length(0, 200)
  category?: string; // Danh mục clan
}
