
import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { SocialModule } from './social-graph/social.module';
import { CommunityModule } from './community/community.module';
import { ModerationModule } from './moderation/moderation.module';
import { InternalController } from './internal.controller';

@Module({
  imports: [AppConfigModule, SocialModule, CommunityModule, ModerationModule],
  controllers: [InternalController],
})
export class AppModule {}
