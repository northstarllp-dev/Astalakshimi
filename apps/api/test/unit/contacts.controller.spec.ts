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
      controller.unlock({ userId: 'u1', phone: '1', role: 'member' }, 'p1')
    ).resolves.toEqual({ success: true });
    expect(contactsService.unlock).toHaveBeenCalledWith('u1', 'p1');
  });

  it('forwards an empty targetProfileId to the service (UUID validation is the pipe\'s job, covered in e2e)', async () => {
    contactsService.unlock.mockResolvedValue({ success: false });
    await controller.unlock({ userId: 'u1', phone: '1', role: 'member' }, '');
    // Pipe does not run in a direct unit call; the controller forwards as-is.
    expect(contactsService.unlock).toHaveBeenCalledWith('u1', '');
  });
});
