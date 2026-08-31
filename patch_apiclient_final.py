import re

with open('apps/web/src/lib/api-client.ts', 'r') as f:
    content = f.read()

old_func = """    getPhotoUploadUrl: (profileId: string, data: { contentType: string; fileSize: number }) =>
      this.request<{ uploadUrl: string; s3Key: string }>('/admin/profiles/' + profileId + '/upload-url', {
        method: 'POST',
        body: JSON.stringify({
          purpose: 'profile_photo',
          contentType: data.contentType,
          fileSize: data.fileSize,
        }),
      }),"""

new_func = """    uploadPhoto: (profileId: string, data: FormData) =>
      this.request<{ s3Key: string; id: string }>(`/admin/profiles/${profileId}/upload`, {
        method: 'POST',
        body: data,
      }),"""

if old_func in content:
    content = content.replace(old_func, new_func)
    with open('apps/web/src/lib/api-client.ts', 'w') as f:
        f.write(content)
    print("Patched api-client.ts")
else:
    print("Could not find old_func in api-client.ts")
