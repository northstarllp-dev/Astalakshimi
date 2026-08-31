import re

# 1. Update AdminController
with open('apps/api/src/admin/admin.controller.ts', 'r') as f:
    content = f.read()

content = content.replace("import { Controller, Get, Post, Patch, Delete, Param, Body } from '@nestjs/common';",
"import { Controller, Get, Post, Patch, Delete, Param, Body, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';\nimport { FileInterceptor } from '@nestjs/platform-express';")

get_photo_upload_url = """  @Post('profiles/:profileId/upload-url')
  getPhotoUploadUrl(
    @Param('profileId') profileId: string,
    @Body(new ZodValidationPipe(presignedUploadSchema)) body: PresignedUploadInput,
  ) {
    return this.adminService.getPhotoUploadUrl(profileId, body.contentType, body.fileSize);
  }"""

upload_admin_photo = """  @Post('profiles/:profileId/upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  uploadAdminPhoto(
    @Param('profileId') profileId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file provided');
    return this.adminService.uploadAdminPhoto(profileId, file.buffer, file.mimetype, file.size);
  }"""

content = content.replace(get_photo_upload_url, upload_admin_photo)

with open('apps/api/src/admin/admin.controller.ts', 'w') as f:
    f.write(content)

# 2. Update AdminService
with open('apps/api/src/admin/admin.service.ts', 'r') as f:
    content = f.read()

get_photo_upload_url_svc = """  async getPhotoUploadUrl(profileId: string, contentType: string, fileSize: number) {
    const profileRecords = await this.db.select({ id: profiles.id }).from(profiles).where(eq(profiles.id, profileId));
    if (!profileRecords.length) throw new NotFoundException('Profile not found');

    const existingPhotos = await this.db.select({ id: profilePhotos.id }).from(profilePhotos).where(eq(profilePhotos.profileId, profileId));
    if (existingPhotos.length >= 6) throw new ConflictException('Maximum 6 photos allowed.');

    const s3Key = `profiles/${profileId}/photos/${crypto.randomUUID()}`;
    const [photo] = await this.db.insert(profilePhotos).values({
      profileId,
      s3Key,
      isPrimary: existingPhotos.length === 0,
      displayOrder: existingPhotos.length,
      status: 'approved',
    }).returning();

    const uploadUrl = await this.s3.generatePresignedUrl(photo.s3Key, contentType, fileSize);
    return { uploadUrl, s3Key: photo.s3Key, id: photo.id };
  }"""

upload_admin_photo_svc = """  async uploadAdminPhoto(profileId: string, buffer: Buffer, contentType: string, fileSize: number) {
    const profileRecords = await this.db.select({ id: profiles.id }).from(profiles).where(eq(profiles.id, profileId));
    if (!profileRecords.length) throw new NotFoundException('Profile not found');

    const existingPhotos = await this.db.select({ id: profilePhotos.id }).from(profilePhotos).where(eq(profilePhotos.profileId, profileId));
    if (existingPhotos.length >= 6) throw new ConflictException('Maximum 6 photos allowed.');

    const s3Key = `profiles/${profileId}/photos/${crypto.randomUUID()}`;
    const [photo] = await this.db.insert(profilePhotos).values({
      profileId,
      s3Key,
      isPrimary: existingPhotos.length === 0,
      displayOrder: existingPhotos.length,
      status: 'approved',
    }).returning();

    await this.s3.putObject(photo.s3Key, buffer, contentType);
    return { s3Key: photo.s3Key, id: photo.id };
  }"""

content = content.replace(get_photo_upload_url_svc, upload_admin_photo_svc)

with open('apps/api/src/admin/admin.service.ts', 'w') as f:
    f.write(content)

# 3. Update api-client.ts
with open('apps/web/src/lib/api-client.ts', 'r') as f:
    content = f.read()

get_photo_upload_url_api = """    getPhotoUploadUrl: (profileId: string, data: PresignedUploadRequest) =>
      this.request<PresignedUploadResponse>(`/admin/profiles/${profileId}/upload-url`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),"""

upload_photo_api = """    uploadPhoto: (profileId: string, data: FormData) =>
      this.request<{ s3Key: string; id: string }>(`/admin/profiles/${profileId}/upload`, {
        method: 'POST',
        body: data,
      }),"""

content = content.replace(get_photo_upload_url_api, upload_photo_api)

with open('apps/web/src/lib/api-client.ts', 'w') as f:
    f.write(content)

# 4. Update admin-queries.ts
with open('apps/web/src/hooks/admin-queries.ts', 'r') as f:
    content = f.read()

old_upload_loop = """      const s3Keys: string[] = []
      for (const file of photos) {
        const contentType = file.type === "image/jpg" ? "image/jpeg" : file.type || "image/jpeg"
        const { uploadUrl, s3Key } = await apiClient.admin.getPhotoUploadUrl(profile.id, {
          contentType,
          fileSize: file.size,
        })
        await apiClient.media.uploadFileToS3(uploadUrl, file, contentType)
        s3Keys.push(s3Key)
      }"""

new_upload_loop = """      const s3Keys: string[] = []
      for (const file of photos) {
        const formData = new FormData()
        formData.append("file", file)
        const { s3Key } = await apiClient.admin.uploadPhoto(profile.id, formData)
        s3Keys.push(s3Key)
      }"""

content = content.replace(old_upload_loop, new_upload_loop)

with open('apps/web/src/hooks/admin-queries.ts', 'w') as f:
    f.write(content)

print("All files patched successfully!")
