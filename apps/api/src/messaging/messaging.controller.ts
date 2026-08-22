import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { MessagingService, SendMessageDto } from './messaging.service';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserSession } from '@astalakshimi/types';

@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly messagingService: MessagingService) {}

  @Get('threads')
  getThreads(@CurrentUser() user: UserSession) {
    return this.messagingService.getThreads(user.userId);
  }

  @Get(':threadId/messages')
  getMessages(
    @CurrentUser() user: UserSession,
    @Param('threadId') threadId: string,
  ) {
    return this.messagingService.getMessages(user.userId, threadId);
  }

  @Post(':threadId/messages')
  sendMessage(
    @CurrentUser() user: UserSession,
    @Param('threadId') threadId: string,
    @Body() body: SendMessageDto,
  ) {
    return this.messagingService.sendMessage(user.userId, threadId, body);
  }

  @Patch(':threadId/read')
  markRead(
    @CurrentUser() user: UserSession,
    @Param('threadId') threadId: string,
  ) {
    return this.messagingService.markThreadRead(user.userId, threadId);
  }
}

// Controller alias for messaging endpoints
@UseGuards(JwtAuthGuard)
@Controller('messaging')
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Get('threads')
  getThreads(@CurrentUser() user: UserSession) {
    return this.messagingService.getThreads(user.userId);
  }

  @Get(':threadId/messages')
  getMessages(
    @CurrentUser() user: UserSession,
    @Param('threadId') threadId: string,
  ) {
    return this.messagingService.getMessages(user.userId, threadId);
  }

  @Post(':threadId/messages')
  sendMessage(
    @CurrentUser() user: UserSession,
    @Param('threadId') threadId: string,
    @Body() body: SendMessageDto,
  ) {
    return this.messagingService.sendMessage(user.userId, threadId, body);
  }

  @Patch(':threadId/read')
  markRead(
    @CurrentUser() user: UserSession,
    @Param('threadId') threadId: string,
  ) {
    return this.messagingService.markThreadRead(user.userId, threadId);
  }
}
