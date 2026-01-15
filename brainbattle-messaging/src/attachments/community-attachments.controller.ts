import {
  BadRequestException,
  Controller,
  Headers,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AttachmentsService } from './attachments.service';
import { wrapSuccess } from '../shared/response.helper';
import { toAttachmentDto } from '../shared/dto-mappers';

// Type definition for Multer file (duplicated to avoid exporting from legacy controller)
type MulterFile = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

@ApiTags('Community')
@Controller('community/attachments')
export class CommunityAttachmentsController {
  constructor(private readonly service: AttachmentsService) {}

  @ApiOperation({
    summary: 'Upload attachment for community messaging (no JWT)',
    description:
      'Uploads a file to MinIO and returns an AttachmentDto. Uses the same storage logic as /v1/attachments/upload but without JWT auth.',
  })
  @ApiConsumes('multipart/form-data')
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
    }),
  )
  async upload(
    @UploadedFile() file?: MulterFile,
    @Headers('x-user-id') userIdHeader?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const userId = userIdHeader || 'me';
    // Reuse legacy storage logic: group objects under synthetic community key
    const conversationId = `community-${userId}`;

    const raw = await this.service.uploadAttachment(conversationId, userId, file);

    const dto = toAttachmentDto({
      id: raw.objectKey,
      kind: raw.kind,
      url: raw.url,
      fileName: file.originalname,
      size: raw.size,
      mime: raw.mime,
      width: raw.width,
      height: raw.height,
    });

    return wrapSuccess(dto);
  }
}
