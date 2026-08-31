import re

with open('apps/api/src/admin/admin.service.ts', 'r') as f:
    content = f.read()

# Replace getProfile
start_idx = content.find('  async getProfile(profileId: string) {')
end_idx = content.find('  async createProfile(input: AdminCreateProfileInput) {')

if start_idx != -1 and end_idx != -1:
    new_get_profile = """  async getProfile(profileId: string) {
    const profileRecords = await this.db.select().from(profiles).where(eq(profiles.id, profileId));
    if (!profileRecords.length) throw new NotFoundException('Profile not found');
    const p = profileRecords[0];

    const userRecords = await this.db.select().from(users).where(eq(users.id, p.userId));
    const u = userRecords[0];

    const verificationRecords = await this.db.select().from(verifications).where(eq(verifications.profileId, profileId));
    const v = verificationRecords[0];

    const [dbPhotos, horoscopeRecords, familyRecords, lifestyleRecords, prefRecords, activeSub] = await Promise.all([
      this.db.select().from(profilePhotos).where(eq(profilePhotos.profileId, profileId)),
      this.db.select().from(horoscopes).where(eq(horoscopes.profileId, profileId)),
      this.db.select().from(familyDetails).where(eq(familyDetails.profileId, profileId)),
      this.db.select().from(lifestyleInterests).where(eq(lifestyleInterests.profileId, profileId)),
      this.db.select().from(partnerPreferences).where(eq(partnerPreferences.profileId, profileId)),
      this.db
        .select({ userId: subscriptions.userId })
        .from(subscriptions)
        .where(and(eq(subscriptions.userId, p.userId), eq(subscriptions.status, 'active')))
        .limit(1),
    ]);

    const mappedPhotos = dbPhotos
      .map((ph) => ({
        id: ph.id,
        s3Key: ph.s3Key,
        isPrimary: ph.isPrimary,
        displayOrder: ph.displayOrder,
        status: ph.status,
      }))
      .sort((a, b) => a.displayOrder - b.displayOrder);

    const h = horoscopeRecords[0];
    const fam = familyRecords[0];
    const ls = lifestyleRecords[0];
    const pref = prefRecords[0];
    
    const dobParts = p.dob ? String(p.dob).split('-') : [];
    const verificationStatus = v?.status || 'idle';

    return {
      id: p.id,
      phone: u.phone,
      profileFor: p.profileFor,
      fullName: p.fullName,
      gender: p.gender,
      city: p.city,
      state: p.state,
      religion: p.religion,
      caste: p.caste,
      motherTongue: p.motherTongue,
      dobDay: dobParts[2] || '01',
      dobMonth: dobParts[1] || '01',
      dobYear: dobParts[0] || '2000',
      maritalStatus: p.maritalStatus,
      brothersCount: fam?.brothersCount || 0,
      sistersCount: fam?.sistersCount || 0,
      aboutMe: p.aboutMe,
      completeness: calculateProfileCompleteness({
        profile: p,
        userPhone: u.phone,
        family: fam,
        lifestyle: ls,
        horoscope: h,
        preferences: pref,
        photoCount: mappedPhotos.length,
        verificationStatus,
        submittedAt: v?.updatedAt || p.createdAt,
      }),
      createdBy: 'self' as const,
      accountStatus: u.status,
      submittedAt: v?.updatedAt || p.createdAt,
      activeSubscription: activeSub.length > 0,
    };
  }

"""
    content = content[:start_idx] + new_get_profile + content[end_idx:]

with open('apps/api/src/admin/admin.service.ts', 'w') as f:
    f.write(content)

