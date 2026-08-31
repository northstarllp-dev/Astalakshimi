import re

with open('apps/web/src/lib/api-client.ts', 'r') as f:
    content = f.read()

old_code = """      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
        },
        body: file,
      });"""

new_code = """      let finalUrl = uploadUrl;
      if (finalUrl.startsWith('/api/media/demo-upload')) {
        finalUrl = `/api/proxy${finalUrl.replace('/api/media', '/media')}`;
      }

      const response = await fetch(finalUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
        },
        body: file,
      });"""

if old_code in content:
    content = content.replace(old_code, new_code)
    with open('apps/web/src/lib/api-client.ts', 'w') as f:
        f.write(content)
    print("Patched api-client.ts successfully!")
else:
    print("Could not find the target code block.")
