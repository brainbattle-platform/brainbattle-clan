import { Module } from '@nestjs/common';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { SecurityModule } from '../security/security.module';

@Module({
  imports: [SecurityModule],
  controllers: [ModerationController, AdminController],
  providers: [ModerationService, AdminService, PrismaService],
  exports: [ModerationService, AdminService],
})
export class ModerationModule {}
