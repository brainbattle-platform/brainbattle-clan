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
<<<<<<< Updated upstream
  imports: [
    SecurityModule,
    EventsModule,
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
  ],
  controllers: [
    CommunityController,
    CommunityInternalController,
    CommunityApiController,
  ],
=======
  imports: [SecurityModule, EventsModule],
  controllers: [CommunityController, CommunityInternalController, CommunityApiController],
>>>>>>> Stashed changes
  providers: [CommunityService, PrismaService],
  exports: [CommunityService],
})
export class CommunityModule {}
