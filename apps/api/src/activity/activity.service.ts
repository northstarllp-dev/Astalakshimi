import { Injectable, Inject } from '@nestjs/common';
import { DB_CLIENT } from '../database/database.constants';
import type { Database } from '@astalakshimi/database';
import { profiles, interests, shortlists, profilePhotos, profileViews } from '@astalakshimi/database';
import { eq, and, desc } from 'drizzle-orm';

@Injectable()
export class ActivityService {
  constructor(@Inject(DB_CLIENT) private readonly db: Database) {}

  async getSummary(userId: string) {
    // Get the user's profile ID
    const [userProfile] = await this.db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);

    if (!userProfile) {
      return {
        viewers: [],
        youViewed: [],
        interestsReceived: [],
        shortlistedYou: [],
      };
    }

    const profileId = userProfile.id;

    // 1. Fetch Interests received
    const receivedInterests = await this.db
      .select({
        interest: interests,
        sender: profiles,
      })
      .from(interests)
      .innerJoin(profiles, eq(interests.senderProfileId, profiles.id))
      .where(
        and(
          eq(interests.receiverProfileId, profileId),
          eq(interests.status, 'pending')
        )
      )
      .orderBy(desc(interests.createdAt))
      .limit(10);

    // 2. Fetch Shortlists (who shortlisted you)
    const receivedShortlists = await this.db
      .select({
        shortlist: shortlists,
        sender: profiles,
      })
      .from(shortlists)
      .innerJoin(profiles, eq(shortlists.profileId, profiles.id))
      .where(eq(shortlists.targetProfileId, profileId))
      .orderBy(desc(shortlists.createdAt))
      .limit(10);

    // 3. Fetch Views (who viewed you)
    const recentViewers = await this.db
      .select({
        view: profileViews,
        viewer: profiles,
      })
      .from(profileViews)
      .innerJoin(profiles, eq(profileViews.viewerProfileId, profiles.id))
      .where(eq(profileViews.targetProfileId, profileId))
      .orderBy(desc(profileViews.viewedAt))
      .limit(10);

    return {
      viewers: recentViewers.map((r) => ({
        id: r.viewer.id,
        name: r.viewer.fullName,
        photo: null,
        subtitle: r.view.viewedAt.toISOString(),
      })),
      youViewed: [], // Implement if needed
      interestsReceived: receivedInterests.map((r) => ({
        id: r.sender.id,
        name: r.sender.fullName,
        photo: null, // Should join photos if needed
        subtitle: r.interest.createdAt.toISOString(),
      })),
      shortlistedYou: receivedShortlists.map((r) => ({
        id: r.sender.id,
        name: r.sender.fullName,
        photo: null,
        subtitle: r.shortlist.createdAt.toISOString(),
      })),
    };
  }
}
