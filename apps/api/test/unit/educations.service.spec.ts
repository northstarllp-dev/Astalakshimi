import { Test, TestingModule } from '@nestjs/testing';
import { EducationsService } from '../../src/educations/educations.service';
import { DB_CLIENT } from '../../src/database/database.constants';

describe('EducationsService', () => {
  let service: EducationsService;

  const mockDb = {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue([]),
    execute: jest.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EducationsService,
        {
          provide: DB_CLIENT,
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get(EducationsService);
    jest.clearAllMocks();
  });

  it('lists education levels ordered by display order', async () => {
    mockDb.orderBy.mockResolvedValueOnce([
      { id: 1, name: '10th' },
      { id: 8, name: 'B.Tech' },
    ]);

    const levels = await service.listLevels();

    expect(levels).toEqual([
      { id: 1, name: '10th' },
      { id: 8, name: 'B.Tech' },
    ]);
  });

  it('lists specializations for a given education id', async () => {
    mockDb.orderBy.mockResolvedValueOnce([
      { id: 10, name: 'Computer Science', educationId: 8 },
    ]);

    const specs = await service.listSpecializations(8);

    expect(specs).toEqual([{ id: 10, name: 'Computer Science', educationId: 8 }]);
  });
});
