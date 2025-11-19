import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class CreateClanDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsIn(['public', 'private'])
  visibility: 'public' | 'private';
}