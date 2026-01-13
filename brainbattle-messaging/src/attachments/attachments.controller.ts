import { Controller, Post, Delete, Get, Param, Req, UseGuards, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { HttpJwtGuard } from '../security/http-jwt.guard';
import { AttachmentsService } from './attachments.service';

// Type definition for Multer file
type MulterFile = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@ApiTags('Attachments')
@ApiBearerAuth('access-token')
@UseGuards(HttpJwtGuard)
@Controller('v1/attachments')
export class AttachmentsController {
  constructor(private readonly service: AttachmentsService) {}

  @ApiOperation({ summary: 'Upload file attachment' })
  @ApiConsumes('multipart/form-data')
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB
    },
  }))
  async upload(
    @Req() req: any,
    @UploadedFile() file?: MulterFile,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    
    const conversationId = req.body.conversationId;
    if (!conversationId) throw new BadRequestException('conversationId is required');

    return this.service.uploadAttachment(conversationId, req.user.id, file);
  }

  @ApiOperation({ summary: 'Get signed URL for attachment' })
  @Get(':attachmentId/url')
  async getSignedUrl(@Param('attachmentId') attachmentId: string) {
    const url = await this.service.getSignedUrl(attachmentId);
    return { url };
  }

  @ApiOperation({ summary: 'Delete attachment' })
  @Delete(':attachmentId')
  async deleteAttachment(
    @Req() req: any,
    @Param('attachmentId') attachmentId: string,
  ) {
    return this.service.deleteAttachment(attachmentId, req.user.id);
  }
}
