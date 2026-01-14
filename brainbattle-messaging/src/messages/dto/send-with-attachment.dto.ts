import { IsString, IsOptional } from 'class-validator';

/**
 * DTO để gửi message với attachment
 * File được upload trước, sau đó gửi message reference
 */
export class SendMessageWithAttachmentDto {
  @IsString()
  conversationId: string;

  @IsOptional()
  @IsString()
  content?: string; // Optional text content

  @IsOptional()
  @IsString()
  attachmentId?: string; // ID của attachment đã upload trước
}
