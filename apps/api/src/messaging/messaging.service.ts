import { Injectable, Inject, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { DB_CLIENT } from '../database/database.constants';
import type { Database } from '@astalakshimi/database';
import { messages, profiles, profilePhotos, interests } from '@astalakshimi/database';
import { eq, or, and, desc, asc, inArray, sql } from 'drizzle-orm';
import { NotificationsService } from '../notifications/notifications.service';

export interface SendMessageDto {
  text: string;
  receiverProfileId?: string;
}

@Injectable()
export class MessagingService implements OnModuleInit {
  constructor(
    @Inject(DB_CLIENT) private readonly db: Database,
    private readonly notificationsService: NotificationsService,
  ) {}

  async onModuleInit() {
    // Ensure the messages table exists in local/dev database
    try {
      await this.db.execute(sql`
        CREATE TABLE IF NOT EXISTS messages (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          thread_id VARCHAR(255) NOT NULL,
          sender_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
          receiver_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
          text TEXT NOT NULL,
          is_read BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS messages_thread_idx ON messages(thread_id);
        CREATE INDEX IF NOT EXISTS messages_sender_receiver_idx ON messages(sender_profile_id, receiver_profile_id);
      `);
    } catch (err) {
      // Table might already exist
    }
  }

  private async getProfileByUserId(userId: string) {
    const [profile] = await this.db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    if (!profile) {
      throw new NotFoundException('User profile not found. Please complete your profile.');
    }

    return profile;
  }

  private async resolvePartnerProfileId(userProfileId: string, threadIdOrProfileId: string): Promise<{ partnerProfileId: string; interestId?: string } | null> {
    if (!threadIdOrProfileId) return null;

    // 1. If threadIdOrProfileId is a direct profile ID
    const [directProfile] = await this.db
      .select()
      .from(profiles)
      .where(eq(profiles.id, threadIdOrProfileId))
      .limit(1);

    if (directProfile && directProfile.id !== userProfileId) {
      const [interest] = await this.db
        .select()
        .from(interests)
        .where(
          or(
            and(eq(interests.senderProfileId, userProfileId), eq(interests.receiverProfileId, directProfile.id)),
            and(eq(interests.senderProfileId, directProfile.id), eq(interests.receiverProfileId, userProfileId))
          )
        )
        .limit(1);

      return { partnerProfileId: directProfile.id, interestId: interest?.id };
    }

    // 2. If threadIdOrProfileId is an interest ID
    const [interest] = await this.db
      .select()
      .from(interests)
      .where(eq(interests.id, threadIdOrProfileId))
      .limit(1);

    if (interest) {
      const partnerId =
        interest.senderProfileId === userProfileId
          ? interest.receiverProfileId
          : interest.senderProfileId;
      return { partnerProfileId: partnerId, interestId: interest.id };
    }

    return null;
  }

  async getMessages(userId: string, threadId: string) {
    const userProfile = await this.getProfileByUserId(userId);
    const resolved = await this.resolvePartnerProfileId(userProfile.id, threadId);
    const partnerId = resolved ? resolved.partnerProfileId : threadId;
    const interestId = resolved?.interestId;

    // Fetch messages where:
    // (sender = user AND receiver = partner) OR
    // (sender = partner AND receiver = user) OR
    // threadId matches
    const conditions = [
      and(
        eq(messages.senderProfileId, userProfile.id),
        eq(messages.receiverProfileId, partnerId)
      ),
      and(
        eq(messages.senderProfileId, partnerId),
        eq(messages.receiverProfileId, userProfile.id)
      ),
      eq(messages.threadId, threadId),
    ];

    if (partnerId && partnerId !== threadId) {
      conditions.push(eq(messages.threadId, partnerId));
    }
    if (interestId) {
      conditions.push(eq(messages.threadId, interestId));
    }

    const rows = await this.db
      .select({
        id: messages.id,
        threadId: messages.threadId,
        senderProfileId: messages.senderProfileId,
        receiverProfileId: messages.receiverProfileId,
        text: messages.text,
        isRead: messages.isRead,
        createdAt: messages.createdAt,
        senderName: profiles.fullName,
      })
      .from(messages)
      .leftJoin(profiles, eq(messages.senderProfileId, profiles.id))
      .where(or(...conditions))
      .orderBy(asc(messages.createdAt));

    // Mark unread incoming messages as read
    await this.db
      .update(messages)
      .set({ isRead: true })
      .where(
        and(
          eq(messages.receiverProfileId, userProfile.id),
          eq(messages.senderProfileId, partnerId),
          eq(messages.isRead, false)
        )
      );

    return rows.map((m) => ({
      id: m.id,
      threadId: m.threadId,
      senderProfileId: m.senderProfileId,
      receiverProfileId: m.receiverProfileId,
      senderName: m.senderName || 'Member',
      text: m.text,
      isRead: m.isRead,
      createdAt: m.createdAt,
      time: m.createdAt
        ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : 'Just now',
      isSelf: m.senderProfileId === userProfile.id,
    }));
  }

  async sendMessage(userId: string, threadId: string, dto: SendMessageDto) {
    if (!dto.text || !dto.text.trim()) {
      throw new BadRequestException('Message text cannot be empty');
    }

    const senderProfile = await this.getProfileByUserId(userId);

    // Resolve receiver partner profile ID
    let targetProfileId = dto.receiverProfileId;
    if (targetProfileId === senderProfile.id) {
      targetProfileId = undefined;
    }

    if (!targetProfileId) {
      const resolved = await this.resolvePartnerProfileId(senderProfile.id, threadId);
      if (resolved) {
        targetProfileId = resolved.partnerProfileId;
      }
    }

    if (!targetProfileId || targetProfileId === senderProfile.id) {
      throw new BadRequestException('Target recipient profile required');
    }

    const [targetProfile] = await this.db
      .select()
      .from(profiles)
      .where(eq(profiles.id, targetProfileId))
      .limit(1);

    if (!targetProfile) {
      throw new NotFoundException('Target recipient profile not found');
    }

    if (targetProfile.userId === userId || targetProfile.id === senderProfile.id) {
      throw new BadRequestException('Cannot send message to yourself');
    }

    // 1. Insert message into database ALWAYS linking both sender and recipient
    const [newMsg] = await this.db
      .insert(messages)
      .values({
        threadId: targetProfile.id,
        senderProfileId: senderProfile.id,
        receiverProfileId: targetProfile.id,
        text: dto.text.trim(),
        isRead: false,
      })
      .returning();

    // 2. Trigger asynchronous notification ONLY to the recipient (never to sender X)
    if (targetProfile.userId !== userId && targetProfile.id !== senderProfile.id) {
      try {
        await this.notificationsService.createNotification({
          userId: targetProfile.userId,
          actorProfileId: senderProfile.id,
          title: `New message from ${senderProfile.fullName}`,
          body: dto.text.length > 60 ? dto.text.slice(0, 57) + '...' : dto.text,
          category: 'messages',
          kind: 'interest_accepted',
          href: `/inbox/${senderProfile.id}`,
        });
      } catch (err) {
        // Non-blocking notification failure
      }
    }

    // 3. Return the message object so X's UI immediately keeps and displays the sent message
    return {
      id: newMsg.id,
      threadId: newMsg.threadId,
      senderProfileId: newMsg.senderProfileId,
      receiverProfileId: newMsg.receiverProfileId,
      senderName: senderProfile.fullName,
      text: newMsg.text,
      isRead: newMsg.isRead,
      createdAt: newMsg.createdAt,
      time: new Date(newMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isSelf: true,
    };
  }

  async getThreads(userId: string) {

    const userProfile = await this.getProfileByUserId(userId);

    // Find accepted interest connections
    const acceptedInterests = await this.db
      .select({
        interest: interests,
        otherProfile: profiles,
      })
      .from(interests)
      .innerJoin(
        profiles,
        sql`${profiles.id} = CASE WHEN ${interests.senderProfileId} = ${userProfile.id} THEN ${interests.receiverProfileId} ELSE ${interests.senderProfileId} END`
      )
      .where(
        and(
          eq(interests.status, 'accepted'),
          or(
            eq(interests.senderProfileId, userProfile.id),
            eq(interests.receiverProfileId, userProfile.id)
          )
        )
      )
      .orderBy(desc(interests.updatedAt));

    if (acceptedInterests.length === 0) return [];

    const otherProfileIds = acceptedInterests.map((r) => r.otherProfile.id);

    const photos = await this.db
      .select()
      .from(profilePhotos)
      .where(
        and(
          inArray(profilePhotos.profileId, otherProfileIds),
          eq(profilePhotos.isPrimary, true)
        )
      );

    const photoMap = new Map(photos.map((p) => [p.profileId, p.s3Key]));

    const threads = await Promise.all(
      acceptedInterests.map(async (item) => {
        const p = item.otherProfile;
        const threadId = item.interest.id;

        // Fetch last message
        const [lastMsg] = await this.db
          .select()
          .from(messages)
          .where(
            or(
              eq(messages.threadId, threadId),
              and(
                eq(messages.senderProfileId, userProfile.id),
                eq(messages.receiverProfileId, p.id)
              ),
              and(
                eq(messages.senderProfileId, p.id),
                eq(messages.receiverProfileId, userProfile.id)
              )
            )
          )
          .orderBy(desc(messages.createdAt))
        // Fetch unread count for incoming messages from this partner
        const [unreadRow] = await this.db
          .select({ count: sql<number>`count(*)` })
          .from(messages)
          .where(
            and(
              eq(messages.receiverProfileId, userProfile.id),
              eq(messages.senderProfileId, p.id),
              eq(messages.isRead, false)
            )
          );

        const age = p.dob
          ? Math.floor((new Date().getTime() - new Date(p.dob).getTime()) / 31557600000)
          : 25;

        return {
          threadId: p.id,
          interestId: item.interest.id,
          profileId: p.id,
          profile: {
            id: p.id,
            fullName: p.fullName,
            age,
            city: p.city || 'Unknown',
            state: p.state || '',
            caste: p.caste || '',
            profession: p.profession || 'Professional',
            photo: photoMap.get(p.id) || null,
          },
          lastMessage: lastMsg?.text || 'Connected! Start the conversation.',
          lastMessageTime: lastMsg?.createdAt
            ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : 'Recently',
          unreadCount: Number(unreadRow?.count || 0),
        };
      })
    );

    return threads;
  }


  async markThreadRead(userId: string, threadId: string) {
    const userProfile = await this.getProfileByUserId(userId);

    await this.db
      .update(messages)
      .set({ isRead: true })
      .where(
        and(
          eq(messages.receiverProfileId, userProfile.id),
          or(
            eq(messages.threadId, threadId),
            eq(messages.senderProfileId, threadId)
          )
        )
      );

    return { success: true };
  }
}
