import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

// @UseGuards(JwtAuthGuard, RolesGuard)
// @Roles('admin', 'moderator')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('verifications/pending')
  getPendingVerifications() {
    return this.adminService.getPendingVerifications();
  }

  @Patch('verifications/:profileId')
  updateVerificationStatus(
    @Param('profileId') profileId: string,
    @Body() body: { status: 'verified' | 'rejected', rejectionReason?: string },
  ) {
    return this.adminService.updateVerificationStatus(profileId, body.status, body.rejectionReason);
  }

  @Get('profiles/:profileId')
  getProfile(@Param('profileId') profileId: string) {
    return this.adminService.getProfile(profileId);
  }
}
