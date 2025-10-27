import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { PrismaModule } from './prisma/prisma.module';
import { ThreadsModule } from './threads/threads.module';
import { ChatGateway } from './gateway/chat.gateway';
import { RateLimitService } from './rate/rl.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        PORT: Joi.number().default(3002),
        DATABASE_URL: Joi.string().required(),
        REDIS_URL: Joi.string().required(),
        JWT_ISSUER: Joi.string().required(),
        JWT_AUDIENCE: Joi.string().required(),
        JWT_PUBLIC_KEY_BASE64: Joi.string().required(),
      }),
    }),
    PrismaModule,
    ThreadsModule,
  ],
  providers: [ChatGateway, RateLimitService],
})
export class AppModule {}
