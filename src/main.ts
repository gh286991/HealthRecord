import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 啟用 CORS
  app.enableCors({
    origin: (origin, callback) => {
      // 允許的來源
      const allowedOrigins = [
        'http://localhost:3030',
        /^https:\/\/.*\.zeabur\.app$/, // 允許所有 zeabur.app 子網域
      ];

      // 如果沒有 origin（如 Postman 或服務器端請求），則允許
      if (!origin) return callback(null, true);

      // 檢查是否為允許的來源
      const isAllowed = allowedOrigins.some((allowedOrigin) => {
        if (typeof allowedOrigin === 'string') {
          return origin === allowedOrigin;
        } else {
          return allowedOrigin.test(origin);
        }
      });

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

  await app.listen(9090);
  console.log('🚀 伺服器已啟動在 http://localhost:9090');
  console.log('📖 Swagger 文件可在 http://localhost:9090/api 查看');
}
bootstrap();
