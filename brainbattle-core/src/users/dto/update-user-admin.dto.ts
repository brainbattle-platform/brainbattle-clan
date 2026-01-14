import { IsEnum, IsOptional } from 'class-validator';

export enum UserRole {
  LEARNER = 'learner',
  CREATOR = 'creator',
  ADMIN = 'admin',
}

export class UpdateUserAdminDto {
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  suspended?: boolean;
}
