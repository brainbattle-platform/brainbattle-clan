import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { CommunityModule } from './community/community.module';
import { ConversationsModule } from './conversations/conversations.module';
import { HttpExceptionFilter } from './common/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(helmet());
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger configuration for Community APIs
  const config = new DocumentBuilder()
    .setTitle('brainbattle-messaging APIs')
    .setDescription('Community messaging: threads, messages, presence')
    .setVersion('1.0')
    .addServer('http://localhost:4002', 'Local (external)')
    .addServer('http://localhost:3001', 'Local (internal)')
    .addTag('Community', 'Community messaging endpoints (no auth required)')
    .addTag('Internal', 'Internal service-to-service endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    include: [CommunityModule, ConversationsModule],
    // Only include controllers with Community or Internal tags
  });
  
  SwaggerModule.setup('docs', app, document);

  const PORT = process.env.PORT || 3001;
  await app.listen(PORT);
  console.log(`✓ Messaging service listening on port ${PORT}`);
}
bootstrap();
