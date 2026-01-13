import { IsString, IsEnum } from 'class-validator';

export enum ClanRole {
  LEADER = 'leader',
  OFFICER = 'officer',
  MEMBER = 'member',
}

/**
 * DTO để promote/demote thành viên trong clan
 * Leader only
 */
export class PromoteMemberDto {
  @IsString()
  userId: string;

  @IsEnum(ClanRole)
  role: ClanRole; // Vai trò mới
}
