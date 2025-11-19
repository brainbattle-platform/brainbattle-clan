import { Module } from '@nestjs/common';
import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';
import { PrismaService } from '../prisma/prisma.service';
import { CommunityInternalController } from './community.internal.controller';
@Module({ controllers: [CommunityController, CommunityInternalController], providers: [CommunityService, PrismaService] })
export class CommunityModule { }
