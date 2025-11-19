import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PresignDto {
  @IsString()
  @IsOptional()
  folder?: string; // vd: 'avatars', 'dm', ...

  @IsString()
  @IsIn(['image', 'video', 'file'])
  @IsOptional()
  kind?: 'image' | 'video' | 'file';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  size?: number;
}
