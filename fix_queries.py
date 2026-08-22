import re

with open("apps/web/src/hooks/queries.ts", "r") as f:
    content = f.read()

# Fix imports
content = re.sub(r'import { MATCHES } from "@/lib/matches"\n', '', content)
content = re.sub(r'import { isPaidMember, loadInvoices, loadSubscription } from "@/lib/plans"\n', '', content)
content = re.sub(r'import { markProfileVerified } from "@/lib/portal-access"\n', '', content)
content = re.sub(r'import {\n(.*?)from "@/lib/user-activity"\n', '', content, flags=re.DOTALL)

# Fix useMatchesQuery
content = re.sub(r'queryFn: async \(\) => MATCHES,', r'queryFn: async () => { const res = await apiClient.search.searchProfiles(); return res.profiles; },', content)

# Fix paid, subscription, invoices queries
content = re.sub(r'queryFn: async \(\) => isPaidMember\(\),', r'queryFn: async () => false,', content)
content = re.sub(r'queryFn: async \(\) => loadSubscription\(\),', r'queryFn: async () => null,', content)
content = re.sub(r'queryFn: async \(\) => loadInvoices\(\),', r'queryFn: async () => [],', content)

# Fix markProfileVerified
content = re.sub(r'mutationFn: async \(\) => markProfileVerified\(\),', r'mutationFn: async () => null,', content)

# Fix user-activity functions
content = re.sub(r'queryFn: async \(\) => loadNotifications\(\),', r'queryFn: async () => [],', content)
content = re.sub(r'queryFn: async \(\) => getUnreadNotificationCount\(\),', r'queryFn: async () => 0,', content)
content = re.sub(r'mutationFn: async \(id: string\) => markNotificationRead\(id\),', r'mutationFn: async (id: string) => null,', content)
content = re.sub(r'mutationFn: async \(\) => markAllNotificationsRead\(\),', r'mutationFn: async () => null,', content)
content = re.sub(r'mutationFn: async \(\) => clearAllNotifications\(\),', r'mutationFn: async () => null,', content)
content = re.sub(r'queryFn: async \(\) => loadSkipped\(\),', r'queryFn: async () => [],', content)
content = re.sub(r'mutationFn: async \(profileId: string\) => addSkipped\(profileId\),', r'mutationFn: async (profileId: string) => [],', content)
content = re.sub(r'mutationFn: async \(search: Omit<SavedSearch, "id">\) => addSavedSearch\(search\),', r'mutationFn: async (search: any) => [],', content)
content = re.sub(r'queryFn: async \(\) => loadSavedSearches\(\),', r'queryFn: async () => [],', content)

# Fix useInterestsQuery mutual matches etc
content = re.sub(r'mutual: getMutualMatches\(\),', r'mutual: [],', content)
content = re.sub(r'blocked: loadBlocked\(\),', r'blocked: [],', content)
content = re.sub(r'notes: loadPrivateNotes\(\),', r'notes: [],', content)

with open("apps/web/src/hooks/queries.ts", "w") as f:
    f.write(content)
