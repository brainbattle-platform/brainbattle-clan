import { Module } from '@nestjs/common';
import { AttachmentsService } from './attachments.service';
import { AttachmentsController } from './attachments.controller';
import { PrismaService } from '../prisma/prisma.service';
import { SecurityModule } from '../security/security.module';

@Module({
  imports: [SecurityModule],
  providers: [AttachmentsService, PrismaService],
  controllers: [AttachmentsController],
  exports: [AttachmentsService],
})
export class AttachmentsModule {}
