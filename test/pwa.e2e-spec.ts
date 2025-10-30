import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';

// 簡易 e2e：驗證 /pwa 路由存在與 JWT 保護（不提供 token 需 401）
describe('PWA (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /pwa/status should require auth', async () => {
    await request(app.getHttpServer()).get('/pwa/status').expect(401);
  });

  it('POST /pwa/event should require auth', async () => {
    await request(app.getHttpServer()).post('/pwa/event').send({ event: 'later' }).expect(401);
  });

  it('GET /pwa/summary should require auth', async () => {
    await request(app.getHttpServer()).get('/pwa/summary').expect(401);
  });
});


