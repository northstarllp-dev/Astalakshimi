import re

with open('apps/api/src/admin/admin.service.ts', 'r') as f:
    content = f.read()

old_func = """  async getPhotoUploadUrl(profileId: string, contentType: string, fileSize: number) {
    const [profile] = await this.db
      .select({ userId: profiles.userId })
      .from(profiles)
      .where(eq(profiles.id, profileId))
      .limit(1);
    if (!profile) throw new NotFoundException('Profile not found');

    return this.s3Provider.generateUploadUrl(profile.userId, 'profile_photo', contentType, fileSize);
  }"""

new_func = """  async uploadAdminPhoto(profileId: string, buffer: Buffer, contentType: string, fileSize: number) {
    const [profile] = await this.db
      .select({ userId: profiles.userId })
      .from(profiles)
      .where(eq(profiles.id, profileId))
      .limit(1);
    if (!profile) throw new NotFoundException('Profile not found');

    const { s3Key, bucket } = await this.s3Provider.generateUploadUrl(
      profile.userId,
      'profile_photo',
      contentType,
      fileSize
    );

    await this.s3Provider.putObject(s3Key, buffer, contentType, bucket);
    
    return { s3Key };
  }"""

if old_func in content:
    content = content.replace(old_func, new_func)
    with open('apps/api/src/admin/admin.service.ts', 'w') as f:
        f.write(content)
    print("Patched admin.service.ts")
else:
    print("Could not find old_func in admin.service.ts")
