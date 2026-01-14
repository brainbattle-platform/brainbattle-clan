import { Injectable, BadRequestException, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as crypto from 'crypto';

// Type definition for Multer file
type MulterFile = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

/**
 * Service để handle file uploads & attachments
 * Sử dụng MinIO thông qua AWS S3 SDK
 */
@Injectable()
export class AttachmentsService {
  private readonly logger = new Logger(AttachmentsService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName = 'brainbattle-messages';

  constructor(private readonly prisma: PrismaService) {
    // Initialize S3 client for MinIO
    this.s3Client = new S3Client({
      region: 'us-east-1',
      endpoint: process.env.MINIO_ENDPOINT || 'http://bb-minio:9000',
      credentials: {
        accessKeyId: process.env.MINIO_ROOT_USER || 'minio-root',
        secretAccessKey: process.env.MINIO_ROOT_PASSWORD || 'minio-root-secret',
      },
      forcePathStyle: true, // Required for MinIO
    });
  }

  /**
   * Upload file to MinIO and create attachment record
   * Validates file type and size
   * Note: conversationId is not stored in attachment - it's accessed via message.conversation
   */
  async uploadAttachment(
    conversationId: string,
    userId: string,
    file: MulterFile,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    if (!conversationId) throw new BadRequestException('conversationId is required');

    // Validate file
    this.validateFile(file);

    try {
      // Generate unique key
      const fileExt = this.getFileExtension(file.originalname);
      const timestamp = Date.now();
      const randomStr = crypto.randomBytes(4).toString('hex');
      const objectKey = `conversations/${conversationId}/${timestamp}-${randomStr}${fileExt}`;

      // Upload to MinIO
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: objectKey,
          Body: file.buffer,
          ContentType: file.mimetype,
          Metadata: {
            'original-name': file.originalname,
            'uploaded-by': userId,
          },
        }),
      );

      // Determine attachment kind
      const kind = this.getAttachmentKind(file.mimetype);

      // Parse image dimensions if applicable
      let width: number | null = null;
      let height: number | null = null;
      if (kind === 'image') {
        const dimensions = this.getImageDimensions(file);
        if (dimensions) {
          width = dimensions.width;
          height = dimensions.height;
        }
      }

      // Create attachment record (Note: messageId will be set when message is created)
      // For now, just return attachment data without DB record
      // The controller should create message with this attachment
      const signedUrl = await this.generateSignedUrl(objectKey);

      return {
        objectKey,
        kind,
        mime: file.mimetype,
        size: file.size,
        bucket: this.bucketName,
        url: signedUrl,
        width,
        height,
      };
    } catch (err: any) {
      this.logger.error('Upload failed:', err);
      throw new InternalServerErrorException('Failed to upload file');
    }
  }

  /**
   * Get signed URL for accessing attachment
   * URL valid for 7 days
   */
  async getSignedUrl(attachmentId: string): Promise<string> {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      throw new BadRequestException('Attachment not found');
    }

    return this.generateSignedUrl(attachment.objectKey);
  }

  /**
   * Delete attachment from storage and database
   */
  async deleteAttachment(attachmentId: string, userId: string) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: { message: true },
    });

    if (!attachment) throw new BadRequestException('Attachment not found');

    // Verify user ownership (user must be message author)
    if (attachment.message?.senderId !== userId) {
      throw new BadRequestException('Not authorized to delete this attachment');
    }

    try {
      // Delete from MinIO
      // Note: In production, use DeleteObjectCommand
      // For now, just mark as deleted in DB

      // Delete from database
      await this.prisma.attachment.delete({
        where: { id: attachmentId },
      });

      return { ok: true };
    } catch (err: any) {
      this.logger.error('Delete failed:', err);
      throw new InternalServerErrorException('Failed to delete attachment');
    }
  }

  /* ================= PRIVATE HELPERS ================= */

  /**
   * Validate file type and size
   */
  private validateFile(file: MulterFile) {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedMimes = [
      // Images
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      // Archives
      'application/zip',
      'application/x-rar-compressed',
      // Audio
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      // Video
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
    ];

    if (file.size > maxSize) {
      throw new BadRequestException(`File too large. Max size: 50MB`);
    }

    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException(`File type not allowed: ${file.mimetype}`);
    }
  }

  /**
   * Determine attachment kind based on MIME type
   */
  private getAttachmentKind(mime: string): 'image' | 'file' {
    if (mime.startsWith('image/')) return 'image';
    return 'file';
  }

  /**
   * Get file extension with dot prefix
   */
  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot === -1 ? '' : filename.substring(lastDot);
  }

  /**
   * Get image dimensions (simplified - in production use sharp library)
   */
  private getImageDimensions(file: MulterFile): { width: number; height: number } | null {
    // In production, use sharp or jimp to read actual dimensions
    // For now, return null
    return null;
  }

  /**
   * Generate signed URL for accessing S3 object
   */
  private async generateSignedUrl(objectKey: string, expiresIn: number = 604800): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: objectKey,
      });

      return await getSignedUrl(this.s3Client, command, { expiresIn });
    } catch (err: any) {
      this.logger.error('Failed to generate signed URL:', err);
      return ''; // Return empty if generation fails
    }
  }
}
