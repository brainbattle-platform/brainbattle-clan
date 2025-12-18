import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';

import { PrismaModule } from '../prisma/prisma.module';
import { ThreadsService } from './threads.service';
import { ThreadsController } from './threads.controller';
import { CoreClient } from '../core/core.client';

@Module({
  imports: [PrismaModule, HttpModule],
  controllers: [ThreadsController],
  providers: [ThreadsService, CoreClient],
})
export class ThreadsModule {}
