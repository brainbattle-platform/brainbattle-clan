
import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { SocialModule } from './social/social.module';
import { CommunityModule } from './community/community.module';
import { ModerationModule } from './moderation/moderation.module';
import { InternalController } from './internal.controller';
import { RedisModule } from './redis/redis.module';
import { APP_GUARD } from '@nestjs/core';
import { SecurityModule } from './security/security.module';
@Module({
  imports: [AppConfigModule, SocialModule, CommunityModule, ModerationModule, RedisModule,SecurityModule,],
  controllers: [InternalController],
})
export class AppModule {}
