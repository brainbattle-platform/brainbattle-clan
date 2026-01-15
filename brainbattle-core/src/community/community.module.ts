import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PrismaService } from '../prisma/prisma.service';
import { SecurityModule } from '../security/security.module';
import { EventsModule } from '../events/events.module';
import { CommunityController } from './community.controller';
import { CommunityInternalController } from './community.internal.controller';
import { CommunityApiController } from './community-api.controller';
import { CommunityService } from './community.service';

@Module({
  imports: [
    SecurityModule,
    EventsModule,
    HttpModule.register({
      timeout: 10000,  // Increase timeout to 10s for messaging service calls
      maxRedirects: 5,
      validateStatus: () => true,  // Don't throw on any status code
    }),
  ],
  controllers: [
    CommunityController,
    CommunityInternalController,
    CommunityApiController,
  ],
  providers: [CommunityService, PrismaService],
  exports: [CommunityService],
})
export class CommunityModule {}
