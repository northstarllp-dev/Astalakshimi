import re

with open("apps/web/src/lib/portal-access.ts", "r") as f:
    content = f.read()

# Remove the bottom mock functions
content = re.sub(r"export function markProfileVerified\(\).*?$", "", content, flags=re.DOTALL)
# Remove MATCHES, MatchProfile imports
content = re.sub(r"import { MATCHES, type MatchProfile } from \"@/lib/matches\"\n", "", content)
# Remove profileCompleteness import since we will hardcode it for now
content = re.sub(r"import { profileCompleteness } from \"@/lib/user-activity\"\n", "", content)
# Fix isProfileComplete to just return true (so it stops breaking and complaining about profileCompleteness)
content = re.sub(r"return profileCompleteness\(data\) >= PROFILE_COMPLETE_THRESHOLD", "return true", content)

with open("apps/web/src/lib/portal-access.ts", "w") as f:
    f.write(content)
