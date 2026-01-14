import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { SocialModule } from './social/social.module';
import { CommunityModule } from './community/community.module';
import { ModerationModule } from './moderation/moderation.module';
import { InternalController } from './internal.controller';
import { RedisModule } from './redis/redis.module';
import { SecurityModule } from './security/security.module';
<<<<<<< Updated upstream
import { HealthModule } from './health/health.module';
=======
import { UsersModule } from './users/users.module';

>>>>>>> Stashed changes
@Module({
  imports: [
    AppConfigModule,
    SocialModule,
    CommunityModule,
    ModerationModule,
    RedisModule,
    SecurityModule,
<<<<<<< Updated upstream
    HealthModule,
=======
    UsersModule,
>>>>>>> Stashed changes
  ],
  controllers: [InternalController],
})
export class AppModule {}
