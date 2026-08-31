import { Body, Controller, Get, Post, UseGuards, BadRequestException } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserSession } from '@astalakshimi/types';

@Controller('contacts')
@UseGuards(JwtAuthGuard)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get('usage')
  getUsage(@CurrentUser() user: UserSession) {
    return this.contactsService.getUsage(user.userId);
  }

  @Get('unlocked')
  listUnlocked(@CurrentUser() user: UserSession) {
    return this.contactsService.listUnlocked(user.userId);
  }

  @Post('unlock')
  async unlock(
    @CurrentUser() user: UserSession,
    @Body() body: { targetProfileId?: string },
  ) {
    if (!body?.targetProfileId) {
      throw new BadRequestException('targetProfileId is required');
    }
    return this.contactsService.unlock(user.userId, body.targetProfileId);
  }

  @Post('unlock/order')
  createPaidOrder(
    @CurrentUser() user: UserSession,
    @Body() body: { targetProfileId?: string },
  ) {
    if (!body?.targetProfileId) {
      throw new BadRequestException('targetProfileId is required');
    }
    return this.contactsService.createPaidUnlockOrder(user.userId, body.targetProfileId);
  }

  @Post('unlock/verify')
  verifyPaidUnlock(
    @CurrentUser() user: UserSession,
    @Body()
    body: {
      targetProfileId?: string;
      razorpayOrderId?: string;
      razorpayPaymentId?: string;
      razorpaySignature?: string;
    },
  ) {
    if (
      !body?.targetProfileId ||
      !body.razorpayOrderId ||
      !body.razorpayPaymentId ||
      !body.razorpaySignature
    ) {
      throw new BadRequestException('Missing paid unlock verification details');
    }
    return this.contactsService.verifyPaidUnlock(
      user.userId,
      body.targetProfileId,
      body.razorpayOrderId,
      body.razorpayPaymentId,
      body.razorpaySignature,
    );
  }
}
