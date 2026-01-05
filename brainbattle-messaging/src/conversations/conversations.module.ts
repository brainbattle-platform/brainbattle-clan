import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationsService } from './conversations.service';
import { ConversationsController } from './conversations.controller';
import { SecurityModule } from 'src/security/security.module';
@Module({
  imports: [
    SecurityModule, 
  ],
  controllers: [ConversationsController],
  providers: [PrismaService, ConversationsService],
  exports: [ConversationsService],
})
export class ConversationsModule {}