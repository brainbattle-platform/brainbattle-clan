import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { CommunityModule } from './community/community.module';
import { HttpExceptionFilter } from './common/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Accept, x-user-id, x-admin-key',
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger configuration for Community APIs
  const config = new DocumentBuilder()
    .setTitle('brainbattle-core APIs')
    .setDescription('Community: clan management')
    .setVersion('1.0')
    .addServer('http://localhost:4002', 'Local (external - core)')
    .addServer('http://localhost:3001', 'Local (internal - core)')
    .addTag('Community', 'Community clan endpoints (no auth required)')
    .build();

  // Create Swagger document with explicit module inclusion
  const document = SwaggerModule.createDocument(app, config, {
    include: [CommunityModule],
  });

  // Setup Swagger at /docs endpoint
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  // Also setup at /api/docs for consistency
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3001;
  await app.listen(port, () => {
    console.log(`✓ brainbattle-core listening on port ${port}`);
    console.log(`✓ Swagger API docs: http://localhost:${port}/docs`);
    console.log(`✓ Messaging service baseUrl: ${process.env.MESSAGING_BASE_URL || 'http://messaging:3001'}`);
  });
}

bootstrap().catch((error) => {
  console.error('Failed to bootstrap application:', error);
  process.exit(1);
});

