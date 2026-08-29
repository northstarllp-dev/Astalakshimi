import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from '../../src/health/health.controller';
import { DB_CLIENT } from '../../src/database/database.constants';

describe('Feature 17: Health Check - HealthController (Unit Tests)', () => {
  let controller: HealthController;
  let mockDb: any;

  beforeEach(async () => {
    mockDb = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: DB_CLIENT,
          useValue: mockDb,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  describe('GET /health', () => {
    it('should return healthy status if DB connection is successful', async () => {
      mockDb.execute.mockResolvedValueOnce(true);

      const result = await controller.check();

      expect(result.status).toBe('ok');
      expect(result.database).toBe('healthy');
      expect(result.uptime).toBeGreaterThanOrEqual(0);
      expect(result.timestamp).toBeDefined();
    });

    it('should return disconnected status if DB connection fails', async () => {
      mockDb.execute.mockRejectedValueOnce(new Error('Connection failed'));

      const result = await controller.check();

      expect(result.status).toBe('ok');
      expect(result.database).toBe('disconnected');
    });
  });
});
