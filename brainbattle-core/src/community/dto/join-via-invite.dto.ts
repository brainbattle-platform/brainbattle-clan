import { IsString, Length } from 'class-validator';

/**
 * DTO để join clan qua invite link/code
 */
export class JoinViaInviteDto {
  @IsString()
  @Length(16, 64) // Token format
  token: string; // Invite token hoặc code
}
