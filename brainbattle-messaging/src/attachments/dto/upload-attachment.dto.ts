/**
 * DTO để upload attachment
 * Được gửi qua multipart/form-data
 */
export class UploadAttachmentDto {
  conversationId: string;
  // File sẽ được nhận qua @UseInterceptors(FileInterceptor('file'))
  // và accessible qua req.file
}
