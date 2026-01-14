import { IsOptional, IsNumber, Min, Max } from 'class-validator';

/**
 * DTO để tạo invite link mới cho clan
 * Leader only
 */
export class CreateInviteDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  maxUses?: number; // Số lần sử dụng tối đa, undefined = unlimited

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(43200) // 30 days in minutes
  expiresInMinutes?: number; // Thời gian hết hạn (phút), default = 7 days
}
