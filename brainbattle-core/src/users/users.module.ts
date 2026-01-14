import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { SecurityModule } from '../security/security.module';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [SecurityModule],
  controllers: [UsersController],
  providers: [UsersService, PrismaService],
  exports: [UsersService],
})
export class UsersModule {}
