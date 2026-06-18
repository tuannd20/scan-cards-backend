import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/app.factory';
import { NestExpressApplication } from '@nestjs/platform-express';

describe('AppController (e2e)', () => {
  let app: NestExpressApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestExpressApplication>();
    configureApp(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/ (GET) returns HTML API docs', async () => {
    const response = await request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Content-Type', /text\/html/);

    expect(response.text).toContain('Postman cURL Mapping');
    expect(response.text).toContain('/card-new/scan-card');
    expect(response.text).not.toContain('"status":true');
    expect(response.text).not.toContain('"timestamp"');
  });

  it('/error (GET) still returns wrapped JSON errors', () => {
    return request(app.getHttpServer())
      .get('/error')
      .expect(400)
      .expect('Content-Type', /json/)
      .expect((response) => {
        expect(response.body.status).toBe(false);
        expect(response.body.path).toBe('/error');
        expect(response.body.message).toBe('Custom error occurred');
        expect(response.body.timestamp).toBeDefined();
      });
  });

  it('/card-new/get-all (GET) still returns wrapped JSON success', () => {
    return request(app.getHttpServer())
      .get('/card-new/get-all?type=all&page=1&limit=1')
      .expect(200)
      .expect('Content-Type', /json/)
      .expect((response) => {
        expect(response.body.status).toBe(true);
        expect(response.body.path).toBe('/card-new/get-all?type=all&page=1&limit=1');
        expect(response.body.message).toBe('success');
        expect(response.body.data).toBeDefined();
        expect(response.body.timestamp).toBeDefined();
      });
  });
});
