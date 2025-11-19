import { IsNotEmpty, IsString } from 'class-validator';

export class ApproveJoinDto {
  @IsString()
  @IsNotEmpty()
  userId: string;
}