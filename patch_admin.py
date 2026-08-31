import re

with open('apps/api/src/admin/admin.service.ts', 'r') as f:
    content = f.read()

# 1. Update getAllProfiles
# Find getAllProfiles() { ... }
start_idx = content.find('async getAllProfiles() {')
end_idx = content.find('async getProfile(profileId: string) {')

if start_idx != -1 and end_idx != -1:
    get_all_profiles_code = """async getAllProfiles() {
    const records = await this.db
      .select({
        profile: profiles,
        phone: users.phone,
        accountStatus: users.status,
        verificationStatus: verifications.status,
        submittedAt: verifications.updatedAt,
      })
      .from(profiles)
      .innerJoin(users, eq(profiles.userId, users.id))
      .leftJoin(verifications, eq(profiles.id, verifications.profileId))
      .orderBy(sql`"profiles"."created_at" DESC`);

    if (!records.length) return [];

    const profileIds = records.map((r) => r.profile.id);

    const [dbPhotos, dbHoroscopes, dbFamily, dbLifestyle, dbPreferences, activeSubs] = await Promise.all([
      this.db
        .select()
        .from(profilePhotos)
        .where(inArray(profilePhotos.profileId, profileIds)),
      this.db
        .select()
        .from(horoscopes)
        .where(inArray(horoscopes.profileId, profileIds)),
      this.db
        .select()
        .from(familyDetails)
        .where(inArray(familyDetails.profileId, profileIds)),
      this.db
        .select()
        .from(lifestyleInterests)
        .where(inArray(lifestyleInterests.profileId, profileIds)),
      this.db
        .select()
        .from(partnerPreferences)
        .where(inArray(partnerPreferences.profileId, profileIds)),
      this.db
        .select({ userId: subscriptions.userId })
        .from(subscriptions)
        .where(eq(subscriptions.status, 'active')),
    ]);

    const photosByProfile = new Map<string, typeof dbPhotos>();
    for (const photo of dbPhotos) {
      const list = photosByProfile.get(photo.profileId) ?? [];
      list.push(photo);
      photosByProfile.set(photo.profileId, list);
    }

    const horoscopeByProfile = new Map(dbHoroscopes.map((h) => [h.profileId, h]));
    const familyByProfile = new Map(dbFamily.map((f) => [f.profileId, f]));
    const lifestyleByProfile = new Map(dbLifestyle.map((l) => [l.profileId, l]));
    const prefByProfile = new Map(dbPreferences.map((p) => [p.profileId, p]));
    const activeUserIds = new Set(activeSubs.map((s) => s.userId));

    return records.map((r) => {
      const p = r.profile;
      const profilePhotosList = (photosByProfile.get(p.id) ?? []).sort(
        (a, b) => a.displayOrder - b.displayOrder,
      );
      const horoscope = horoscopeByProfile.get(p.id);
      const verificationStatus = r.verificationStatus || 'idle';

      return {
        id: p.id,
        fullName: p.fullName,
        gender: p.gender,
        city: p.city,
        phone: r.phone,
        verificationStatus,
        accountStatus: r.accountStatus,
        createdBy: 'self' as const,
        submittedAt: r.submittedAt || p.createdAt,
        activeSubscription: activeUserIds.has(p.userId),
        completeness: calculateProfileCompleteness({
          profile: p,
          userPhone: r.phone,
          family: familyByProfile.get(p.id),
          lifestyle: lifestyleByProfile.get(p.id),
          horoscope: horoscope,
          preferences: prefByProfile.get(p.id),
          photoCount: profilePhotosList.length,
          verificationStatus,
          submittedAt: r.submittedAt || p.createdAt,
        }),
        photos: profilePhotosList.map((ph) => ({
          id: ph.id,
          s3Key: ph.s3Key,
          isPrimary: ph.isPrimary,
          status: ph.status,
        })),
      };
    });
  }

  """
    content = content[:start_idx] + get_all_profiles_code + content[end_idx:]

# 2. Update getProfile calculateProfileCompleteness call
get_profile_replace = """completeness: calculateProfileCompleteness({
        profile: p,
        userPhone: u.phone,
        family: fam,
        lifestyle: ls,
        horoscope: horo,
        preferences: pref,
        photoCount: profilePhotosList.length,
        verificationStatus: verificationRecords[0]?.status,
        submittedAt: verificationRecords[0]?.updatedAt,
      }),"""
      
# Find the completeness: calculateProfileCompleteness inside getProfile
import re
content = re.sub(r'completeness:\s*calculateProfileCompleteness\(\{[^\}]+\}\),', get_profile_replace, content, flags=re.DOTALL)

with open('apps/api/src/admin/admin.service.ts', 'w') as f:
    f.write(content)

