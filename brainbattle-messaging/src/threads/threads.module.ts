import { Module } from '@nestjs/common';
import { ThreadsController } from './threads.controller';
import { ThreadsService } from './threads.service';
import { PrismaModule } from '../prisma/prisma.module';
import { HttpModule } from '@nestjs/axios';
import { CoreClient } from '../common/core-client';
@Module({
  imports: [PrismaModule, HttpModule],
  controllers: [ThreadsController],
  providers: [ThreadsService, CoreClient],
  exports: [ThreadsService],
})
export class ThreadsModule {}
