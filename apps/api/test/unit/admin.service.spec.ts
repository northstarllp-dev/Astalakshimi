import { NotFoundException } from '@nestjs/common';
import { AdminService } from '../../src/admin/admin.service';

describe('Feature 14: Admin - AdminService (Unit Tests)', () => {
  let adminService: AdminService;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      select: jest.fn(),
      update: jest.fn(),
    };
    adminService = new AdminService(mockDb);
  });

  const mockQueryBuilder = (resolveValues: any[]) => {
    let callCount = 0;
    return jest.fn(() => {
      callCount++;
      const currentCall = callCount;
      return {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        returning: jest.fn().mockReturnThis(),
        then: jest.fn((resolve) => resolve(resolveValues[currentCall - 1] || [])),
      };
    });
  };

  describe('getStats', () => {
    it('should return aggregated platform stats', async () => {
      mockDb.select = mockQueryBuilder([
        [{ count: 150 }], // users
        [{ count: 140 }], // profiles
        [{ count: 25 }],  // subscriptions
        [{ count: 5 }],   // verifications
      ]);

      const stats = await adminService.getStats();
      expect(stats).toEqual({
        totalUsers: 150,
        totalProfiles: 140,
        activeSubscriptions: 25,
        pendingVerifications: 5,
      });
    });

    it('should handle zero counts', async () => {
      mockDb.select = mockQueryBuilder([[], [], [], []]);

      const stats = await adminService.getStats();
      expect(stats).toEqual({
        totalUsers: 0,
        totalProfiles: 0,
        activeSubscriptions: 0,
        pendingVerifications: 0,
      });
    });
  });

  describe('getPendingVerifications', () => {
    it('should return pending verification requests', async () => {
      const dbRows = [
        { id: 'v1', profileId: 'p1', method: 'aadhaar', status: 'pending' },
      ];
      mockDb.select = mockQueryBuilder([dbRows]);

      const result = await adminService.getPendingVerifications();
      expect(result).toEqual(dbRows);
    });
  });

  describe('updateVerificationStatus', () => {
    it('should update and return verification record', async () => {
      const mockUpdated = { id: 'v1', profileId: 'p1', status: 'verified' };
      mockDb.update = mockQueryBuilder([[mockUpdated]]);

      const result = await adminService.updateVerificationStatus('p1', 'verified');
      expect(result).toEqual(mockUpdated);
    });

    it('should throw NotFoundException if verification request is not found', async () => {
      mockDb.update = mockQueryBuilder([[]]);

      await expect(adminService.updateVerificationStatus('missing-p', 'verified')).rejects.toThrow(
        NotFoundException
      );
    });
  });
});
