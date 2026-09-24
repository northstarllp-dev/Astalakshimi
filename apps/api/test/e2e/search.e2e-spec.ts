import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DB_CLIENT } from '../../src/database/database.constants';
import { JwtService } from '@nestjs/jwt';

describe('SearchController (e2e)', () => {
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
      offset: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
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

  it('/search (GET) should require authentication', () => {
    return request(app.getHttpServer())
      .get('/search')
      .expect(401);
  });

  it('/search (GET) should return 200 with valid token and query params', async () => {
    const token = jwtService.sign({ sub: 'user1', phone: '1234567890' });

    // Mocking the DB chain logic to resolve safely
    dbMock.then.mockImplementation((res, rej) => res([{ id: 'match1' }, { count: 1 }]));

    return request(app.getHttpServer())
      .get('/search?page=1&limit=10&city=Chennai')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});
