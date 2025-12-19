import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { SecurityModule } from '../security/security.module';
import { PrismaService } from '../prisma/prisma.service';
import { SocialController } from './social.controller';
import { SocialInternalController } from './social.internal.controller';
import { SocialService } from './social.service';

@Module({
  imports: [EventsModule, SecurityModule],
  controllers: [SocialController, SocialInternalController],
  providers: [SocialService, PrismaService],
  exports: [SocialService],
})
export class SocialModule {}
