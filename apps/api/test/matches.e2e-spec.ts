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
    dbMock = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      // Catch-all for promises
      then: jest.fn(),
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
    dbMock.then.mockImplementation((res, rej) => res([]));

    return request(app.getHttpServer())
      .get('/matches/top')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});
