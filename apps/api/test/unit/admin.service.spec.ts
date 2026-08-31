import { ConflictException, NotFoundException } from '@nestjs/common';
import { AdminService } from '../../src/admin/admin.service';

describe('Feature 14: Admin - AdminService (Unit Tests)', () => {
  let adminService: AdminService;
  let mockDb: any;
  let mockNotifications: { createNotification: jest.Mock };
  let mockS3: { generateUploadUrl: jest.Mock };

  beforeEach(() => {
    mockNotifications = { createNotification: jest.fn() };
    mockS3 = {
      generateUploadUrl: jest.fn().mockResolvedValue({
        uploadUrl: 'https://s3.example/upload',
        s3Key: 'profiles/u1/photos/a.jpg',
        bucket: 'media',
        expiresInSeconds: 900,
      }),
    };
    mockDb = {
      select: jest.fn(),
      update: jest.fn(),
      insert: jest.fn(),
      transaction: jest.fn(),
    };
    adminService = new AdminService(mockDb, mockNotifications as any, mockS3 as any);
  });

  const mockQueryBuilder = (resolveValues: any[]) => {
    let callCount = 0;
    return jest.fn(() => {
      callCount++;
      const result = resolveValues[callCount - 1] ?? [];
      const chain: any = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        returning: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(result),
        then: (resolve: (value: unknown) => void) => resolve(result),
      };
      return chain;
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
      mockDb.select = mockQueryBuilder([[{ userId: 'user-1' }]]);

      const result = await adminService.updateVerificationStatus('p1', 'verified');
      expect(result).toEqual(mockUpdated);
      expect(mockNotifications.createNotification).toHaveBeenCalled();
    });

    it('should throw NotFoundException if verification request is not found', async () => {
      mockDb.update = mockQueryBuilder([[]]);

      await expect(adminService.updateVerificationStatus('missing-p', 'verified')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('createProfile', () => {
    const baseInput = {
      profileFor: 'Daughter',
      phone: '9876543210',
      fullName: 'Test User',
      gender: 'Female' as const,
      dobDay: '01',
      dobMonth: '01',
      dobYear: '1998',
      maritalStatus: 'Never Married' as const,
      city: 'Chennai',
      religion: 'Hindu',
      caste: 'Vellalar',
      motherTongue: 'Tamil',
      brothersCount: 0,
      sistersCount: 1,
    };

    it('should reject when mobile already has a profile', async () => {
      mockDb.select = mockQueryBuilder([
        [{ id: 'user-1', phone: '9876543210' }],
        [{ id: 'profile-1' }],
      ]);

      await expect(adminService.createProfile(baseInput)).rejects.toThrow(ConflictException);
    });

    it('should create a verified profile for a new mobile number', async () => {
      mockDb.select = mockQueryBuilder([
        [],
        [{ id: 'p-new', userId: 'u-new', fullName: 'Test User', profileFor: 'Daughter', gender: 'Female', city: 'Chennai', state: 'Tamil Nadu', religion: 'Hindu', caste: 'Vellalar', motherTongue: 'Tamil', maritalStatus: 'Never Married', aboutMe: '', createdAt: new Date() }],
        [{ id: 'u-new', phone: '9876543210', status: 'active' }],
        [{ method: 'selfie', status: 'verified' }],
        [],
      ]);
      mockDb.transaction = jest.fn().mockResolvedValue('p-new');

      const result = await adminService.createProfile(baseInput);
      expect(mockDb.transaction).toHaveBeenCalled();
      expect(result.id).toBe('p-new');
      expect(result.verificationStatus).toBe('verified');
      expect(result.phone).toBe('9876543210');
    });
  });
});
