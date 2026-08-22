import re

# Fix plans.ts
with open("apps/web/src/lib/plans.ts", "r") as f:
    lines = f.readlines()
with open("apps/web/src/lib/plans.ts", "w") as f:
    f.writelines(lines[:234] + lines[374:])

# Fix portal-access.ts
with open("apps/web/src/lib/portal-access.ts", "r") as f:
    content = f.read()

content = re.sub(r"export function markProfileVerified\(\).*?$", "", content, flags=re.DOTALL)
content = re.sub(r"import { MATCHES, type MatchProfile } from \"@/lib/matches\"\n", "", content)
content = re.sub(r"import { profileCompleteness } from \"@/lib/user-activity\"\n", "", content)
content = re.sub(r"return profileCompleteness\(data\) >= PROFILE_COMPLETE_THRESHOLD", "return true", content)

with open("apps/web/src/lib/portal-access.ts", "w") as f:
    f.write(content)

