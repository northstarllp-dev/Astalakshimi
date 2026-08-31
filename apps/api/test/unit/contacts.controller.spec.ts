import { ContactsController } from '../../src/contacts/contacts.controller';
import { ContactsService } from '../../src/contacts/contacts.service';
import { BadRequestException } from '@nestjs/common';

describe('ContactsController', () => {
  let controller: ContactsController;
  let contactsService: {
    getUsage: jest.Mock;
    listUnlocked: jest.Mock;
    unlock: jest.Mock;
    createPaidUnlockOrder: jest.Mock;
    verifyPaidUnlock: jest.Mock;
  };

  beforeEach(() => {
    contactsService = {
      getUsage: jest.fn(),
      listUnlocked: jest.fn(),
      unlock: jest.fn(),
      createPaidUnlockOrder: jest.fn(),
      verifyPaidUnlock: jest.fn(),
    };
    controller = new ContactsController(contactsService as unknown as ContactsService);
  });

  it('forwards usage requests', async () => {
    contactsService.getUsage.mockResolvedValue({ remaining: 2 });
    await expect(controller.getUsage({ userId: 'u1', phone: '1', role: 'member' })).resolves.toEqual({
      remaining: 2,
    });
    expect(contactsService.getUsage).toHaveBeenCalledWith('u1');
  });

  it('unlocks a target profile', async () => {
    contactsService.unlock.mockResolvedValue({ success: true });
    await expect(
      controller.unlock({ userId: 'u1', phone: '1', role: 'member' }, { targetProfileId: 'p1' })
    ).resolves.toEqual({ success: true });
    expect(contactsService.unlock).toHaveBeenCalledWith('u1', 'p1');
  });

  it('rejects unlock without targetProfileId', async () => {
    await expect(
      controller.unlock({ userId: 'u1', phone: '1', role: 'member' }, {})
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
