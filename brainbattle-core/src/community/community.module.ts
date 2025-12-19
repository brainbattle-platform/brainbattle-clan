import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SecurityModule } from '../security/security.module';
import { EventsModule } from '../events/events.module';
import { CommunityController } from './community.controller';
import { CommunityInternalController } from './community.internal.controller';
import { CommunityService } from './community.service';

@Module({
  imports: [SecurityModule, EventsModule],
  controllers: [CommunityController, CommunityInternalController],
  providers: [CommunityService, PrismaService],
  exports: [CommunityService],
})
export class CommunityModule {}
