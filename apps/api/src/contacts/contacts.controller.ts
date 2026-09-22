import { Body, Controller, Get, Post, UseGuards, BadRequestException } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { AllowUnverified } from '../common/decorators/allow-unverified.decorator';
import { UuidValidationPipe } from '../common/pipes/uuid-validation.pipe';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserSession } from '@astalakshimi/types';

@Controller('contacts')
@UseGuards(JwtAuthGuard)
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @AllowUnverified()
  @Get('usage')
  getUsage(@CurrentUser() user: UserSession) {
    return this.contactsService.getUsage(user.userId);
  }

  @AllowUnverified()
  @Get('unlocked')
  listUnlocked(@CurrentUser() user: UserSession) {
    return this.contactsService.listUnlocked(user.userId);
  }

  @Post('unlock')
  async unlock(
    @CurrentUser() user: UserSession,
    @Body('targetProfileId', UuidValidationPipe) targetProfileId: string,
  ) {
    return this.contactsService.unlock(user.userId, targetProfileId);
  }

  @Post('unlock/order')
  createPaidOrder(
    @CurrentUser() user: UserSession,
    @Body('targetProfileId', UuidValidationPipe) targetProfileId: string,
  ) {
    return this.contactsService.createPaidUnlockOrder(user.userId, targetProfileId);
  }

  @Post('unlock/verify')
  verifyPaidUnlock(
    @CurrentUser() user: UserSession,
    @Body('targetProfileId', UuidValidationPipe) targetProfileId: string,
    @Body('razorpayOrderId') razorpayOrderId: string,
    @Body('razorpayPaymentId') razorpayPaymentId: string,
    @Body('razorpaySignature') razorpaySignature: string,
  ) {
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      throw new BadRequestException('Missing paid unlock verification details');
    }
    return this.contactsService.verifyPaidUnlock(
      user.userId,
      targetProfileId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    );
  }
}
