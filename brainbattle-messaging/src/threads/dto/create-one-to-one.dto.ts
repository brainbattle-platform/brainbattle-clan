import { IsNotEmpty, IsString } from 'class-validator';

export class CreateOneToOneDto {
  @IsString()
  @IsNotEmpty()
  peerId: string;
}
