import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SearchMessagesDto {
  @IsString()
  @MaxLength(200)
  q: string;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsString()
  limit?: string; 
}
