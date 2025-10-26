import { Module } from '@nestjs/common';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';
import { PrismaService } from '../prisma/prisma.service';
@Module({ controllers: [ModerationController], providers: [ModerationService, PrismaService] })
export class ModerationModule {}
