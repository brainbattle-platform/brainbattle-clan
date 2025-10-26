import { Module } from '@nestjs/common';
import { SocialController } from './social.controller';
import { SocialService } from './social.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({ controllers: [SocialController], providers: [SocialService, PrismaService] })
export class SocialModule {}
