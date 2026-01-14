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
  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger configuration for Community APIs
  const config = new DocumentBuilder()
    .setTitle('brainbattle-core APIs')
    .setDescription('Community: clan management')
    .setVersion('1.0')
    .addServer('http://localhost:4003', 'Local (external)')
    .addServer('http://localhost:3002', 'Local (internal)')
    .addTag('Community', 'Community clan endpoints (no auth required)')
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    include: [CommunityModule],
    // Only include controllers with Community tag
  });

  SwaggerModule.setup('docs', app, document);

  await app.listen(process.env.PORT || 3002);
}
bootstrap();
