import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 啟用 CORS
  const allowAll = process.env.CORS_ALLOW_ALL === 'true';
  const extraOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.enableCors({
    origin: allowAll
      ? true
      : (origin, callback) => {
          const allowedOrigins = [
            'http://localhost:3030',
            ...extraOrigins,
            /^https:\/\/.*\.zeabur\.app$/,
          ];

          if (!origin) return callback(null, true);

          const isAllowed = allowedOrigins.some((allowedOrigin) =>
            typeof allowedOrigin === 'string' ? origin === allowedOrigin : allowedOrigin.test(origin),
          );

          callback(null, isAllowed);
        },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe());

  // Swagger 設定
  const config = new DocumentBuilder()
    .setTitle('Health API')
    .setDescription('健康管理系統 API 文件')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // 提供靜態檔案服務
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  const port = parseInt(process.env.PORT ?? '', 10) || 9181;
  await app.listen(port);
  console.log(`🚀 伺服器已啟動在 http://localhost:${port}`);
  console.log(`📖 Swagger 文件可在 http://localhost:${port}/api 查看`);
}
bootstrap();
