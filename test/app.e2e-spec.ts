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
    expect(response.text).toContain('/easy-card-scanner/cards/scans');
    expect(response.text).not.toContain('"status":true');
    expect(response.text).not.toContain('"timestamp"');
  });

  it('/error (GET) still returns wrapped JSON errors', () => {
    return request(app.getHttpServer())
      .get('/error')
      .expect(400)
      .expect('Content-Type', /json/)
      .expect((response) => {
        expect(response.body.message).toBe('Custom error occurred');
        expect(response.body.statusCode).toBe(400);
        expect(response.body.data).toBeDefined();
        expect(response.body.timestamp).toBeDefined();
        expect(response.body.status).toBeUndefined();
        expect(response.body.path).toBeUndefined();
      });
  });

  it('/easy-card-scanner/cards (GET) still returns wrapped JSON success', () => {
    return request(app.getHttpServer())
      .get('/easy-card-scanner/cards?type=all&page=1&limit=1')
      .expect(200)
      .expect('Content-Type', /json/)
      .expect((response) => {
        expect(response.body.message).toBe('success');
        expect(response.body.statusCode).toBe(200);
        expect(response.body.data).toBeDefined();
        expect(response.body.timestamp).toBeDefined();
        expect(response.body.status).toBeUndefined();
        expect(response.body.path).toBeUndefined();
      });
  });
});
