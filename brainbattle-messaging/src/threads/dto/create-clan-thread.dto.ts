import { IsNotEmpty, IsString } from 'class-validator';

export class CreateClanThreadDto {
  @IsString()
  @IsNotEmpty()
  clanId: string;
}
