import { Controller, Post, Delete, Get, Param, UseGuards } from '@nestjs/common';
import { BlocksService } from './blocks.service';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('blocks')
@UseGuards(JwtAuthGuard)
export class BlocksController {
  constructor(private readonly blocksService: BlocksService) {}

  @Get()
  async getBlockedProfiles(@CurrentUser() user: any) {
    return this.blocksService.getBlockedProfiles(user.userId);
  }

  @Post(':profileId')
  async blockProfile(@CurrentUser() user: any, @Param('profileId') targetProfileId: string) {
    return this.blocksService.blockProfile(user.userId, targetProfileId);
  }

  @Delete(':profileId')
  async unblockProfile(@CurrentUser() user: any, @Param('profileId') targetProfileId: string) {
    return this.blocksService.unblockProfile(user.userId, targetProfileId);
  }
}
