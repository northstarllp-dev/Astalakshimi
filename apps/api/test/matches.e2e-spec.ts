import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { DB_CLIENT } from '../src/database/database.constants';
import { JwtService } from '@nestjs/jwt';

describe('MatchesController (e2e)', () => {
  let app: INestApplication;
  let jwtService: JwtService;
  let dbMock: any;

  beforeAll(async () => {
    const qbProxy = new Proxy({}, {
      get: (target, prop) => {
        if (prop === 'then') {
          return (resolve) => resolve([{ id: 'user1', phone: '1234567890', role: 'member', status: 'active' }]);
        }
        return () => qbProxy;
      },
    });

    dbMock = {
      select: () => qbProxy,
      insert: () => qbProxy,
      update: () => qbProxy,
      delete: () => qbProxy,
      transaction: jest.fn((cb) => cb(dbMock)),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DB_CLIENT)
      .useValue(dbMock)
      .compile();

    app = moduleFixture.createNestApplication();
    jwtService = moduleFixture.get<JwtService>(JwtService);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/matches/top (GET) should require authentication', () => {
    return request(app.getHttpServer())
      .get('/matches/top')
      .expect(401);
  });

  it('/matches/top (GET) should return 200 with valid token', async () => {
    // Generate a valid mock token
    const token = jwtService.sign({ sub: 'user1', phone: '1234567890' });

    // Just mocking the DB response to avoid crashing the service logic

    return request(app.getHttpServer())
      .get('/matches/top')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});
