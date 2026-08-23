import { Controller, Get, Post, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserSession } from '@astalakshimi/types';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { sendMessageSchema, type SendMessageInput } from '@astalakshimi/validation';

@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('threads')
  getThreads(@CurrentUser() user: UserSession) {
    return this.chatService.getThreads(user.userId);
  }

  @Get(':threadId/messages')
  getMessages(
    @CurrentUser() user: UserSession,
    @Param('threadId') threadId: string,
  ) {
    return this.chatService.getMessages(user.userId, threadId);
  }

  @Post(':threadId/messages')
  sendMessage(
    @CurrentUser() user: UserSession,
    @Param('threadId') threadId: string,
    @Body(new ZodValidationPipe(sendMessageSchema)) body: SendMessageInput,
  ) {
    return this.chatService.sendMessage(user.userId, threadId, body);
  }

  @Patch(':threadId/read')
  markRead(
    @CurrentUser() user: UserSession,
    @Param('threadId') threadId: string,
  ) {
    return this.chatService.markThreadRead(user.userId, threadId);
  }
}

