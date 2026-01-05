import { Module } from '@nestjs/common';
import { SecurityModule } from 'src/security/security.module';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [SecurityModule],
  controllers: [NotificationsController],
  providers: [PrismaService, NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
