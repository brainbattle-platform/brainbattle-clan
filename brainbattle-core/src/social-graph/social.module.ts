import { Module } from '@nestjs/common';
import { SocialController } from './social.controller';
import { SocialInternalController } from './social.internal.controller';
import { SocialService } from './social.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [SocialController],
  providers: [SocialService, PrismaService],
  exports: [SocialService],
})
export class SocialModule {}


