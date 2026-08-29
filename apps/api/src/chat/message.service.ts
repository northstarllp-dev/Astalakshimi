import { Injectable, Inject, ForbiddenException } from '@nestjs/common';
import { ContactGuardService } from './guard/contact-guard.service';
import { DB_CLIENT } from '../database/database.constants';
import type { Database } from '@astalakshimi/database';
import { messages } from '@astalakshimi/database';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { BlocksService } from '../blocks/blocks.service';

@Injectable()
export class MessageService {
  constructor(
    @Inject(DB_CLIENT) private readonly db: Database,
    private readonly contactGuard: ContactGuardService,
    private readonly entitlementsService: EntitlementsService,
    private readonly blocksService: BlocksService,
  ) {}

  async processMessage(senderProfileId: string, receiverProfileId: string, text: string, threadId: string) {
    const profile1Id = senderProfileId < receiverProfileId ? senderProfileId : receiverProfileId;
    const profile2Id = senderProfileId > receiverProfileId ? senderProfileId : receiverProfileId;

    // 1. Check if chat session is already blocked
    const isSessionBlocked = await this.entitlementsService.isChatBlocked(profile1Id, profile2Id);
    if (isSessionBlocked) {
      throw new ForbiddenException('Chat is permanently blocked for these users.');
    }

    // 1b. Check if either user is manually blocked
    const isUserBlocked = await this.blocksService.isBlocked(profile1Id, profile2Id);
    if (isUserBlocked) {
      throw new ForbiddenException('Cannot send message. You or the other user have blocked each other.');
    }

    // 2. Pass through Contact Guard
    const guardResult = await this.contactGuard.checkMessage(text);
    
    if (guardResult.status === 'BLOCKED') {
      return guardResult;
    }

    // 3. Save to database
    const [savedMessage] = await this.db.insert(messages).values({
      senderProfileId,
      receiverProfileId,
      text,
      threadId,
    }).returning();

    return {
      status: 'ALLOW',
      message: savedMessage,
    };
  }
}
