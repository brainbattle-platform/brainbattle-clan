
import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { SocialModule } from './social-graph/social.module';
import { CommunityModule } from './community/community.module';
import { ModerationModule } from './moderation/moderation.module';

@Module({
  imports: [AppConfigModule, SocialModule, CommunityModule, ModerationModule],
})
export class AppModule {}
