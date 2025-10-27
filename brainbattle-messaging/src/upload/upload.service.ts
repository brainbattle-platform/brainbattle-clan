import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

@Injectable()
export class UploadService {
  private s3: S3Client;
  private bucket: string;
  private publicBase: string;

  constructor(cfg: ConfigService) {
    this.bucket = cfg.get<string>('S3_BUCKET')!;
    this.publicBase = cfg.get<string>('S3_PUBLIC_BASE')!;
    this.s3 = new S3Client({
      region: cfg.get<string>('S3_REGION')!,
      endpoint: cfg.get<string>('S3_ENDPOINT')!,
      forcePathStyle: true,
      credentials: {
        accessKeyId: cfg.get<string>('S3_ACCESS_KEY')!,
        secretAccessKey: cfg.get<string>('S3_SECRET_KEY')!,
      },
    });
  }

  async presign(userId: string, type: string, ext = 'bin', size?: number) {
    // bạn có thể validate type/size ở đây
    const key = `users/${userId}/${Date.now()}-${randomUUID()}.${ext}`;
    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: type,
      // ACL: 'public-read', // nếu dùng S3 public
    });
    const uploadUrl = await getSignedUrl(this.s3, cmd, { expiresIn: 300 });
    return {
      uploadUrl,
      objectKey: key,
      publicUrl: `${this.publicBase}/${key}`,
      headers: { 'Content-Type': type },
      expiresIn: 300,
    };
  }
}
