import { Injectable, Inject, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { DB_CLIENT } from '../database/database.constants';
import type { Database } from '@astalakshimi/database';
import { interests, profiles, profilePhotos } from '@astalakshimi/database';
import { eq, or, and, sql, desc, inArray, ne } from 'drizzle-orm';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { NotificationsService } from '../notifications/notifications.service';

import { BlocksService } from '../blocks/blocks.service';

@Injectable()
export class InterestsService {
  constructor(
    @Inject(DB_CLIENT) private readonly db: Database,
    private readonly entitlementsService: EntitlementsService,
    private readonly notificationsService: NotificationsService,
    private readonly blocksService: BlocksService,
  ) {}

  private async getSenderProfile(userId: string) {
    const [profile] = await this.db
      .select()
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    if (!profile) {
      throw new NotFoundException('User profile not found. Please complete your profile first.');
    }

    return profile;
  }

  private async resolveTargetProfile(targetProfileId?: string, targetUserId?: string) {
    if (targetProfileId) {
      const [profile] = await this.db
        .select()
        .from(profiles)
        .where(eq(profiles.id, targetProfileId))
        .limit(1);

      if (profile) return profile;
    }

    if (targetUserId) {
      const [profile] = await this.db
        .select()
        .from(profiles)
        .where(eq(profiles.userId, targetUserId))
        .limit(1);

      if (profile) return profile;
    }

    throw new NotFoundException('Target profile not found');
  }

  async sendInterest(
    userId: string,
    params: { targetProfileId?: string; targetUserId?: string; profileId?: string; message?: string },
  ) {
    const targetId = params.targetProfileId || params.profileId;
    const sender = await this.getSenderProfile(userId);
    const target = await this.resolveTargetProfile(targetId, params.targetUserId);

    if (sender.id === target.id) {
      throw new BadRequestException('Cannot send interest to yourself');
    }

    const isBlocked = await this.blocksService.isBlocked(sender.id, target.id);
    if (isBlocked) {
      throw new ForbiddenException('Cannot send interest to this profile.');
    }

    // 1. Verify Plan & Quota Limits
    const plan = await this.entitlementsService.getUserPlan(userId);
    if (plan.interestQuota !== null && plan.interestQuota !== undefined) {
      const [sentCountResult] = await this.db
        .select({ count: sql<number>`count(*)::int` })
        .from(interests)
        .where(
          and(
            eq(interests.senderProfileId, sender.id),
            or(eq(interests.status, 'pending'), eq(interests.status, 'accepted'))
          )
        );

      const sentCount = sentCountResult?.count ?? 0;
      if (sentCount >= plan.interestQuota) {
        throw new ForbiddenException(
          `You have reached your interest quota limit of ${plan.interestQuota}. Upgrade your plan to send more interests.`
        );
      }
    }

    // 2. Check if a reverse interest already exists (target user already sent interest to sender)
    const [reverseInterest] = await this.db
      .select()
      .from(interests)
      .where(
        and(
          eq(interests.senderProfileId, target.id),
          eq(interests.receiverProfileId, sender.id)
        )
      )
      .limit(1);

    if (reverseInterest) {
      if (reverseInterest.status === 'pending') {
        // Auto-accept into mutual match!
        const [acceptedInterest] = await this.db
          .update(interests)
          .set({
            status: 'accepted',
            respondedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(interests.id, reverseInterest.id))
          .returning();

        // Notify target user
        await this.notificationsService.createNotification({
          userId: target.userId,
          actorProfileId: sender.id,
          title: 'Interest Accepted!',
          body: `${sender.fullName} accepted your interest request! You are now connected.`,
          category: 'interests',
          kind: 'interest_accepted',
          href: '/inbox',
        });

        // Notify sender user
        await this.notificationsService.createNotification({
          userId: sender.userId,
          actorProfileId: target.id,
          title: 'Mutual Match Connected!',
          body: `You and ${target.fullName} are now connected.`,
          category: 'interests',
          kind: 'interest_accepted',
          href: '/inbox',
        });

        return {
          ...acceptedInterest,
          status: 'accepted' as const,
          isMutual: true,
          message: 'Mutual match! You are now connected.',
        };
      }

      if (reverseInterest.status === 'accepted') {
        return {
          ...reverseInterest,
          status: 'accepted' as const,
          isMutual: true,
          message: 'Already connected.',
        };
      }
    }

    // 3. Check if current user already sent interest to target
    const [existing] = await this.db
      .select()
      .from(interests)
      .where(
        and(
          eq(interests.senderProfileId, sender.id),
          eq(interests.receiverProfileId, target.id)
        )
      )
      .limit(1);

    if (existing) {
      if (existing.status === 'pending') {
        throw new BadRequestException('Interest already sent and is pending response');
      }
      if (existing.status === 'accepted') {
        throw new BadRequestException('You are already connected with this profile');
      }
      if (existing.status === 'declined') {
        throw new BadRequestException('Your previous interest was declined');
      }
      if (existing.status === 'withdrawn') {
        // Allow re-sending if previously withdrawn
        const [reopened] = await this.db
          .update(interests)
          .set({
            status: 'pending',
            message: params.message || existing.message,
            createdAt: new Date(),
            updatedAt: new Date(),
            respondedAt: null,
          })
          .where(eq(interests.id, existing.id))
          .returning();

        // Notify target user
        await this.notificationsService.createNotification({
          userId: target.userId,
          actorProfileId: sender.id,
          title: 'New Interest Received',
          body: params.message
            ? `${sender.fullName} sent you an interest: "${params.message}"`
            : `${sender.fullName} sent you an interest request.`,
          category: 'interests',
          kind: 'interest_received',
          href: '/inbox',
        });

        return {
          ...reopened,
          status: 'pending' as const,
          isMutual: false,
        };
      }
    }

    // 4. Create new Interest row
    const [newInterest] = await this.db
      .insert(interests)
      .values({
        senderProfileId: sender.id,
        receiverProfileId: target.id,
        message: params.message,
        status: 'pending',
      })
      .returning();

    // 5. Trigger notification for target user
    await this.notificationsService.createNotification({
      userId: target.userId,
      actorProfileId: sender.id,
      title: 'New Interest Received',
      body: params.message
        ? `${sender.fullName} sent you an interest: "${params.message}"`
        : `${sender.fullName} sent you an interest request.`,
      category: 'interests',
      kind: 'interest_received',
      href: '/inbox',
    });

    return {
      ...newInterest,
      status: 'pending' as const,
      isMutual: false,
    };
  }

  async getReceivedInterests(userId: string, status?: string) {
    const userProfile = await this.getSenderProfile(userId);

    const conditions: any[] = [eq(interests.receiverProfileId, userProfile.id)];
    if (status) {
      const normStatus = status.toLowerCase();
      if (['pending', 'accepted', 'declined', 'withdrawn'].includes(normStatus)) {
        conditions.push(eq(interests.status, normStatus as any));
      }
    } else {
      conditions.push(ne(interests.status, 'withdrawn'));
    }

    const rows = await this.db
      .select({
        interest: interests,
        sender: profiles,
      })
      .from(interests)
      .innerJoin(profiles, eq(interests.senderProfileId, profiles.id))
      .where(and(...conditions))
      .orderBy(desc(interests.createdAt));

    if (rows.length === 0) return [];

    const senderIds = rows.map((r) => r.sender.id);
    const photos = await this.db
      .select()
      .from(profilePhotos)
      .where(
        and(
          inArray(profilePhotos.profileId, senderIds),
          eq(profilePhotos.isPrimary, true)
        )
      );

    const photoMap = new Map(photos.map((p) => [p.profileId, p.s3Key]));

    return rows.map((r) => this.formatInterestItem(r.interest, r.sender, photoMap.get(r.sender.id)));
  }

  async getSentInterests(userId: string) {
    const userProfile = await this.getSenderProfile(userId);

    const rows = await this.db
      .select({
        interest: interests,
        receiver: profiles,
      })
      .from(interests)
      .innerJoin(profiles, eq(interests.receiverProfileId, profiles.id))
      .where(eq(interests.senderProfileId, userProfile.id))
      .orderBy(desc(interests.createdAt));

    if (rows.length === 0) return [];

    const receiverIds = rows.map((r) => r.receiver.id);
    const photos = await this.db
      .select()
      .from(profilePhotos)
      .where(
        and(
          inArray(profilePhotos.profileId, receiverIds),
          eq(profilePhotos.isPrimary, true)
        )
      );

    const photoMap = new Map(photos.map((p) => [p.profileId, p.s3Key]));

    return rows.map((r) => this.formatInterestItem(r.interest, r.receiver, photoMap.get(r.receiver.id)));
  }

  async getMutualInterests(userId: string) {
    const userProfile = await this.getSenderProfile(userId);

    const rows = await this.db
      .select({
        interest: interests,
        sender: profiles,
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

    if (rows.length === 0) return [];

    const profileIds = rows.map((r) => r.sender.id);
    const photos = await this.db
      .select()
      .from(profilePhotos)
      .where(
        and(
          inArray(profilePhotos.profileId, profileIds),
          eq(profilePhotos.isPrimary, true)
        )
      );

    const photoMap = new Map(photos.map((p) => [p.profileId, p.s3Key]));

    return rows.map((r) => this.formatInterestItem(r.interest, r.sender, photoMap.get(r.sender.id)));
  }

  async getUsage(userId: string) {
    const plan = await this.entitlementsService.getUserPlan(userId);
    const limit = plan.interestQuota ?? null;

    const [profile] = await this.db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    if (!profile) {
      return {
        planSlug: plan.slug,
        limit,
        used: 0,
        remaining: limit,
      };
    }

    const [sentCountResult] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(interests)
      .where(
        and(
          eq(interests.senderProfileId, profile.id),
          or(eq(interests.status, 'pending'), eq(interests.status, 'accepted')),
        ),
      );

    const used = sentCountResult?.count ?? 0;
    const remaining = limit === null ? null : Math.max(0, limit - used);

    return {
      planSlug: plan.slug,
      limit,
      used,
      remaining,
    };
  }

  async getSummary(userId: string) {
    const [received, sent, mutual, blocked] = await Promise.all([
      this.getReceivedInterests(userId),
      this.getSentInterests(userId),
      this.getMutualInterests(userId),
      this.blocksService.getBlockedProfiles(userId),
    ]);

    const pendingCount = received.filter((i) => i.status === 'pending').length;

    return {
      received,
      sent,
      mutual,
      pendingCount,
      shortlisted: [],
      blocked,
      notes: {},
    };
  }

  async updateInterestStatus(
    userId: string,
    interestId: string,
    status: 'accepted' | 'declined' | 'withdrawn'
  ) {
    const profile = await this.getSenderProfile(userId);

    const [interest] = await this.db
      .select()
      .from(interests)
      .where(eq(interests.id, interestId))
      .limit(1);

    if (!interest) {
      throw new NotFoundException('Interest not found');
    }

    if (interest.status === status) {
      throw new BadRequestException(`Interest is already ${status}`);
    }

    if (status === 'withdrawn') {
      if (interest.senderProfileId !== profile.id) {
        throw new BadRequestException('Only sender can withdraw interest');
      }
      if (interest.status !== 'pending') {
        throw new BadRequestException('Can only withdraw pending interests');
      }
    } else {
      if (interest.receiverProfileId !== profile.id) {
        throw new BadRequestException('Only receiver can accept/decline interest');
      }
      if (interest.status !== 'pending') {
        throw new BadRequestException(`Cannot ${status} an interest that is currently ${interest.status}`);
      }
    }

    const [updated] = await this.db
      .update(interests)
      .set({
        status,
        respondedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(interests.id, interestId))
      .returning();

    // If accepted, notify the original sender
    if (status === 'accepted') {
      const [senderProf] = await this.db
        .select()
        .from(profiles)
        .where(eq(profiles.id, interest.senderProfileId))
        .limit(1);

      if (senderProf) {
        await this.notificationsService.createNotification({
          userId: senderProf.userId,
          actorProfileId: profile.id,
          title: 'Interest Accepted!',
          body: `${profile.fullName} accepted your interest request! You can now message them.`,
          category: 'interests',
          kind: 'interest_accepted',
          href: '/inbox',
        });
      }
    }

    return updated;
  }

  async acceptInterest(userId: string, idOrProfileId: string) {
    const userProfile = await this.getSenderProfile(userId);

    let [interest] = await this.db
      .select()
      .from(interests)
      .where(eq(interests.id, idOrProfileId))
      .limit(1);

    if (!interest) {
      [interest] = await this.db
        .select()
        .from(interests)
        .where(
          and(
            eq(interests.senderProfileId, idOrProfileId),
            eq(interests.receiverProfileId, userProfile.id)
          )
        )
        .limit(1);
    }

    if (!interest) {
      throw new NotFoundException('Pending interest from this profile not found');
    }

    return this.updateInterestStatus(userId, interest.id, 'accepted');
  }

  async declineInterest(userId: string, idOrProfileId: string) {
    const userProfile = await this.getSenderProfile(userId);

    let [interest] = await this.db
      .select()
      .from(interests)
      .where(eq(interests.id, idOrProfileId))
      .limit(1);

    if (!interest) {
      [interest] = await this.db
        .select()
        .from(interests)
        .where(
          and(
            eq(interests.senderProfileId, idOrProfileId),
            eq(interests.receiverProfileId, userProfile.id)
          )
        )
        .limit(1);
    }

    if (!interest) {
      throw new NotFoundException('Pending interest from this profile not found');
    }

    return this.updateInterestStatus(userId, interest.id, 'declined');
  }

  async withdrawInterest(userId: string, idOrProfileId: string) {
    const userProfile = await this.getSenderProfile(userId);

    let [interest] = await this.db
      .select()
      .from(interests)
      .where(eq(interests.id, idOrProfileId))
      .limit(1);

    if (!interest) {
      [interest] = await this.db
        .select()
        .from(interests)
        .where(
          and(
            eq(interests.senderProfileId, userProfile.id),
            eq(interests.receiverProfileId, idOrProfileId)
          )
        )
        .limit(1);
    }

    if (!interest) {
      throw new NotFoundException('Sent interest to this profile not found');
    }

    return this.updateInterestStatus(userId, interest.id, 'withdrawn');
  }

  async acceptByProfileId(userId: string, targetProfileId: string) {
    return this.acceptInterest(userId, targetProfileId);
  }

  async declineByProfileId(userId: string, targetProfileId: string) {
    return this.declineInterest(userId, targetProfileId);
  }

  async withdrawByProfileId(userId: string, targetProfileId: string) {
    return this.withdrawInterest(userId, targetProfileId);
  }

  private formatInterestItem(interest: any, otherProfile: any, photoS3Key?: string) {
    const age = otherProfile.dob
      ? Math.floor((new Date().getTime() - new Date(otherProfile.dob).getTime()) / 31557600000)
      : 25;

    return {
      id: interest.id,
      profileId: otherProfile.id,
      status: interest.status,
      message: interest.message,
      createdAt: interest.createdAt,
      respondedAt: interest.respondedAt,
      time: interest.createdAt ? new Date(interest.createdAt).toLocaleDateString() : 'Recently',
      profile: {
        id: otherProfile.id,
        fullName: otherProfile.fullName,
        age,
        city: otherProfile.city || 'Unknown',
        state: otherProfile.state || 'Unknown',
        caste: otherProfile.caste || 'Unknown',
        community: otherProfile.caste || 'Unknown',
        educationLevel: otherProfile.educationLevel || 'Graduate',
        profession: otherProfile.profession || 'Professional',
        photo: photoS3Key || null,
        photos: photoS3Key ? [photoS3Key] : [],
      },
    };
  }
}

