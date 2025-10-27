import { IsString } from 'class-validator';
export class CreateOneToOneDto { @IsString() peerId!: string; }
