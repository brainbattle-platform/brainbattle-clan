import { Module } from '@nestjs/common';
import { AttachmentsService } from './attachments.service';
import { AttachmentsController } from './attachments.controller';
import { PrismaService } from '../prisma/prisma.service';
import { SecurityModule } from '../security/security.module';
import { CommunityAttachmentsController } from './community-attachments.controller';

@Module({
  imports: [SecurityModule],
  providers: [AttachmentsService, PrismaService],
  controllers: [AttachmentsController, CommunityAttachmentsController],
  exports: [AttachmentsService],
})
export class AttachmentsModule {}
