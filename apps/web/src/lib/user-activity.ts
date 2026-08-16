import { MATCHES } from "@/lib/matches"

const SAVED_SEARCHES_KEY = "astalakshimi.savedSearches"
const SHORTLIST_KEY = "astalakshimi.shortlist"
const SKIPPED_KEY = "astalakshimi.skipped"
const INTERESTS_SENT_KEY = "astalakshimi.interests.sent"
const INTERESTS_ACCEPTED_KEY = "astalakshimi.interests.accepted"
const INTERESTS_DECLINED_KEY = "astalakshimi.interests.declined"
const INTERESTS_IGNORED_KEY = "astalakshimi.interests.ignored"
const INTERESTS_WITHDRAWN_KEY = "astalakshimi.interests.withdrawn"
const BLOCKED_KEY = "astalakshimi.blocked"
const PRIVATE_NOTES_KEY = "astalakshimi.privateNotes"
const SETTINGS_KEY = "astalakshimi.settings"
const NOTIFICATIONS_KEY = "astalakshimi.notifications"

export type InboxTab = "interests" | "accepted" | "messages"

export type InterestStatus = "pending" | "accepted" | "declined" | "ignored" | "withdrawn"

export type InterestItem = {
  id: string
  profileId: string
  direction: "received" | "sent"
  time: string
  status: "pending" | "accepted"
}

export type RichInterestItem = {
  id: string
  profileId: string
  direction: "received" | "sent"
  time: string
  status: InterestStatus
  message?: string
}

export type MessageThread = {
  id: string
  profileId: string
  preview: string
  time: string
  unread: boolean
}

export type NotificationCategory = "interests" | "messages" | "profile" | "account"

export type NotificationKind =
  | "interest_received"
  | "interest_accepted"
  | "new_match"
  | "profile_viewed"
  | "shortlisted"
  | "profile_incomplete"
  | "subscription_expiry"
  | "verification_reminder"

export type NotificationItem = {
  id: string
  title: string
  body?: string
  time: string
  createdAt: number
  category: NotificationCategory
  kind: NotificationKind
  /** Always set — never open Discover without a deep link */
  href: string
  unread: boolean
  /** Paid-only content; free users see blurred/lock and go to /plans */
  paidOnly?: boolean
  profileId?: string
  actorName?: string
}

export type SavedSearch = {
  id: string
  label: string
  ageMin: number
  ageMax: number
  city: string
  community: string
}

export type UserSettings = {
  hideProfile: boolean
  photoVisibility: "all" | "accepted" | "premium"
  profileVisibility: "all" | "premium" | "hidden"
  photoBlur: "always" | "accepted" | "never"
  hideFromUsers: string[]
  hideFromCities: string[]
  showLastSeen: boolean
  notifyEmail: boolean
  notifySms: boolean
  notifyPush: boolean
}

const defaultSettings: UserSettings = {
  hideProfile: false,
  photoVisibility: "all",
  profileVisibility: "all",
  photoBlur: "always",
  hideFromUsers: [],
  hideFromCities: [],
  showLastSeen: true,
  notifyEmail: true,
  notifySms: true,
  notifyPush: true,
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = sessionStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return
  sessionStorage.setItem(key, JSON.stringify(value))
}

export function loadSavedSearches(): SavedSearch[] {
  return readJson<SavedSearch[]>(SAVED_SEARCHES_KEY, [])
}

export function saveSavedSearches(items: SavedSearch[]) {
  writeJson(SAVED_SEARCHES_KEY, items)
}

export function addSavedSearch(search: Omit<SavedSearch, "id">): SavedSearch[] {
  const next = [...loadSavedSearches(), { ...search, id: `ss-${Date.now()}` }]
  saveSavedSearches(next)
  return next
}

export function removeSavedSearch(id: string): SavedSearch[] {
  const next = loadSavedSearches().filter((s) => s.id !== id)
  saveSavedSearches(next)
  return next
}

export function loadShortlist(): string[] {
  return readJson<string[]>(SHORTLIST_KEY, MATCHES.slice(0, 2).map((m) => m.id))
}

export function saveShortlist(ids: string[]) {
  writeJson(SHORTLIST_KEY, ids)
}

export function toggleShortlist(profileId: string): string[] {
  const current = loadShortlist()
  const next = current.includes(profileId)
    ? current.filter((id) => id !== profileId)
    : [...current, profileId]
  saveShortlist(next)
  return next
}

export function loadSkipped(): string[] {
  return readJson<string[]>(SKIPPED_KEY, [])
}

export function addSkipped(profileId: string) {
  const current = loadSkipped()
  if (current.includes(profileId)) return current
  const next = [...current, profileId]
  writeJson(SKIPPED_KEY, next)
  return next
}

export function clearSkipped() {
  writeJson(SKIPPED_KEY, [])
}

export function loadInterestsSent(): string[] {
  return readJson<string[]>(INTERESTS_SENT_KEY, [])
}

export function sendInterest(profileId: string) {
  const current = loadInterestsSent()
  if (current.includes(profileId)) return current
  const next = [...current, profileId]
  writeJson(INTERESTS_SENT_KEY, next)
  return next
}

export function loadAccepted(): string[] {
  return readJson<string[]>(INTERESTS_ACCEPTED_KEY, [MATCHES[1]?.id].filter(Boolean) as string[])
}

export function acceptInterest(profileId: string) {
  const current = loadAccepted()
  if (current.includes(profileId)) return current
  const next = [...current, profileId]
  writeJson(INTERESTS_ACCEPTED_KEY, next)
  // Remove from ignored / declined if present
  writeJson(INTERESTS_DECLINED_KEY, loadDeclined().filter((id) => id !== profileId))
  writeJson(INTERESTS_IGNORED_KEY, loadIgnored().filter((id) => id !== profileId))
  return next
}

export function loadDeclined(): string[] {
  return readJson<string[]>(INTERESTS_DECLINED_KEY, [])
}

export function declineInterest(profileId: string) {
  const current = loadDeclined()
  if (current.includes(profileId)) return current
  const next = [...current, profileId]
  writeJson(INTERESTS_DECLINED_KEY, next)
  return next
}

export function loadIgnored(): string[] {
  return readJson<string[]>(INTERESTS_IGNORED_KEY, [])
}

export function ignoreInterest(profileId: string) {
  const current = loadIgnored()
  if (current.includes(profileId)) return current
  const next = [...current, profileId]
  writeJson(INTERESTS_IGNORED_KEY, next)
  return next
}

export function unIgnoreInterest(profileId: string) {
  const next = loadIgnored().filter((id) => id !== profileId)
  writeJson(INTERESTS_IGNORED_KEY, next)
  return next
}

export function loadWithdrawn(): string[] {
  return readJson<string[]>(INTERESTS_WITHDRAWN_KEY, [])
}

export function withdrawInterest(profileId: string) {
  const sentNext = loadInterestsSent().filter((id) => id !== profileId)
  writeJson(INTERESTS_SENT_KEY, sentNext)
  const next = [...loadWithdrawn(), profileId]
  writeJson(INTERESTS_WITHDRAWN_KEY, next)
  return sentNext
}

export function loadBlocked(): string[] {
  return readJson<string[]>(BLOCKED_KEY, [])
}

export function blockProfile(profileId: string) {
  const current = loadBlocked()
  if (current.includes(profileId)) return current
  const next = [...current, profileId]
  writeJson(BLOCKED_KEY, next)
  return next
}

export function unblockProfile(profileId: string) {
  const next = loadBlocked().filter((id) => id !== profileId)
  writeJson(BLOCKED_KEY, next)
  return next
}

export type PrivateNotes = Record<string, string>

export function loadPrivateNotes(): PrivateNotes {
  return readJson<PrivateNotes>(PRIVATE_NOTES_KEY, {})
}

export function savePrivateNote(profileId: string, note: string) {
  const current = loadPrivateNotes()
  const next: PrivateNotes = { ...current, [profileId]: note }
  writeJson(PRIVATE_NOTES_KEY, next)
  return next
}

export function deletePrivateNote(profileId: string) {
  const current = loadPrivateNotes()
  const next = { ...current }
  delete next[profileId]
  writeJson(PRIVATE_NOTES_KEY, next)
  return next
}

export function getReceivedInterests(): InterestItem[] {
  const seed = MATCHES.slice(0, 3)
  const accepted = loadAccepted()
  return seed.map((m, i) => ({
    id: `recv-${m.id}`,
    profileId: m.id,
    direction: "received" as const,
    time: i === 0 ? "2h ago" : i === 1 ? "Yesterday" : "3 days ago",
    status: accepted.includes(m.id) ? ("accepted" as const) : ("pending" as const),
  }))
}

// Rich interest lists for the Interests hub
export function getRichReceivedInterests(): RichInterestItem[] {
  // Seed: first 4 matches sent us interests
  const seed = MATCHES.slice(0, 4)
  const accepted = loadAccepted()
  const declined = loadDeclined()
  const ignored = loadIgnored()
  const times = ["2h ago", "Yesterday", "3 days ago", "1 week ago"]
  const messages = [
    "Hoping to connect — our families seem well matched.",
    "Namaste! Saw your profile and would love to connect.",
    "Your interests align beautifully with mine.",
    undefined,
  ]
  return seed.map((m, i) => {
    let status: InterestStatus = "pending"
    if (accepted.includes(m.id)) status = "accepted"
    else if (declined.includes(m.id)) status = "declined"
    else if (ignored.includes(m.id)) status = "ignored"
    return {
      id: `recv-${m.id}`,
      profileId: m.id,
      direction: "received" as const,
      time: times[i] ?? "This week",
      status,
      message: messages[i],
    }
  })
}

export function getRichSentInterests(): RichInterestItem[] {
  const sent = loadInterestsSent()
  const accepted = loadAccepted()
  const withdrawn = loadWithdrawn()
  const times = ["Today", "Yesterday", "3 days ago", "1 week ago"]
  return sent.map((profileId, i) => ({
    id: `sent-${profileId}`,
    profileId,
    direction: "sent" as const,
    time: times[i] ?? "This week",
    status: accepted.includes(profileId)
      ? ("accepted" as const)
      : withdrawn.includes(profileId)
        ? ("withdrawn" as const)
        : ("pending" as const),
  }))
}

export function getMutualMatches(): RichInterestItem[] {
  const accepted = loadAccepted()
  const sent = loadInterestsSent()
  // Mutual = accepted on both sides (simulated: any accepted received interest that was also sent OR seeded)
  const mutual = accepted.filter((id) => sent.includes(id) || MATCHES.slice(0, 2).some((m) => m.id === id))
  return mutual.map((profileId, i) => ({
    id: `mutual-${profileId}`,
    profileId,
    direction: "received" as const,
    time: i === 0 ? "Yesterday" : "3 days ago",
    status: "accepted" as const,
  }))
}

export function getMessageThreads(): MessageThread[] {
  const accepted = loadAccepted()
  const ids = accepted.length > 0 ? accepted : [MATCHES[0]?.id].filter(Boolean)
  return ids.map((profileId, i) => {
    return {
      id: `thread-${profileId}`,
      profileId: profileId!,
      preview: i === 0 ? "Namaste! Happy to connect with your family." : "Looking forward to speaking soon.",
      time: i === 0 ? "1h ago" : "Yesterday",
      unread: i === 0,
    }
  })
}

export function getThreadMessages(threadId: string) {
  const profileId = threadId.replace("thread-", "")
  const match = MATCHES.find((m) => m.id === profileId)
  const name = match?.fullName?.split(" ")[0] ?? "Member"
  return [
    { id: "1", from: "them" as const, text: `Namaste! This is ${name}. Happy to connect.`, time: "Yesterday" },
    { id: "2", from: "me" as const, text: "Namaste — thank you for accepting. When would be a good time to talk?", time: "Today" },
    { id: "3", from: "them" as const, text: "Weekend evenings work well for our family.", time: "1h ago" },
  ]
}

function seedNotifications(): NotificationItem[] {
  const now = Date.now()
  return [
    {
      id: "n-interest-received",
      title: "Meera R. (27, Madurai) sent you an interest.",
      body: "Open her profile to Accept or Decline.",
      time: "20m ago",
      createdAt: now - 20 * 60 * 1000,
      category: "interests",
      kind: "interest_received",
      href: "/profiles/mr-27-mdu?action=interest",
      unread: true,
      profileId: "mr-27-mdu",
      actorName: "Meera R.",
    },
    {
      id: "n-interest-accepted",
      title: "Your interest to Priya S. was accepted! Chat is now open.",
      body: "Say Namaste and continue the conversation.",
      time: "1h ago",
      createdAt: now - 60 * 60 * 1000,
      category: "messages",
      kind: "interest_accepted",
      href: "/inbox/thread-ps-26-chennai",
      unread: true,
      profileId: "ps-26-chennai",
      actorName: "Priya S.",
    },
    {
      id: "n-new-match",
      title: "5 new profiles matching your preferences are ready.",
      body: "Daily Discover digest — usually sent at 8 AM.",
      time: "Today 8:00 AM",
      createdAt: now - 4 * 60 * 60 * 1000,
      category: "profile",
      kind: "new_match",
      href: "/dashboard",
      unread: true,
    },
    {
      id: "n-profile-viewed",
      title: "Ananya M. viewed your profile.",
      body: "Paid members see the viewer. Free members see a locked preview.",
      time: "2h ago",
      createdAt: now - 2 * 60 * 60 * 1000,
      category: "profile",
      kind: "profile_viewed",
      href: "/profiles/am-28-blr",
      unread: true,
      paidOnly: true,
      profileId: "am-28-blr",
      actorName: "Ananya M.",
    },
    {
      id: "n-shortlisted",
      title: "Someone shortlisted your profile.",
      body: "See who saved you in Interests.",
      time: "Yesterday",
      createdAt: now - 26 * 60 * 60 * 1000,
      category: "interests",
      kind: "shortlisted",
      href: "/interests",
      unread: false,
      paidOnly: true,
    },
    {
      id: "n-incomplete",
      title: "Add a photo to get 8x more responses.",
      body: "Profile incomplete nudge (Day 1 / 3 / 7).",
      time: "Yesterday",
      createdAt: now - 30 * 60 * 60 * 1000,
      category: "account",
      kind: "profile_incomplete",
      href: "/profile/edit#photos",
      unread: false,
    },
    {
      id: "n-expiry",
      title: "Your plan expires in 3 days. Renew now to keep your matches.",
      body: "Subscription alert — also sent 7 days before expiry.",
      time: "2 days ago",
      createdAt: now - 50 * 60 * 60 * 1000,
      category: "account",
      kind: "subscription_expiry",
      href: "/plans",
      unread: false,
    },
    {
      id: "n-verify",
      title: "Upload your ID to get the Verified badge.",
      body: "Verification reminder — 3 days after signup if still pending.",
      time: "3 days ago",
      createdAt: now - 72 * 60 * 60 * 1000,
      category: "account",
      kind: "verification_reminder",
      href: "/register",
      unread: false,
    },
  ]
}

export function loadNotifications(): NotificationItem[] {
  const stored = readJson<NotificationItem[] | null>(NOTIFICATIONS_KEY, null)
  const valid =
    Array.isArray(stored) &&
    stored.length > 0 &&
    stored.every((n) => n && typeof n === "object" && "kind" in n && "category" in n && "href" in n)
  if (!valid) {
    const seeded = seedNotifications()
    writeJson(NOTIFICATIONS_KEY, seeded)
    return seeded
  }
  return stored
}

export function saveNotifications(items: NotificationItem[]) {
  writeJson(NOTIFICATIONS_KEY, items)
}

/** @deprecated use loadNotifications */
export function getNotifications(): NotificationItem[] {
  return loadNotifications()
}

export function getUnreadNotificationCount() {
  return loadNotifications().filter((n) => n.unread).length
}

export function markNotificationRead(id: string): NotificationItem[] {
  const next = loadNotifications().map((n) => (n.id === id ? { ...n, unread: false } : n))
  saveNotifications(next)
  return next
}

export function markAllNotificationsRead(): NotificationItem[] {
  const next = loadNotifications().map((n) => ({ ...n, unread: false }))
  saveNotifications(next)
  return next
}

export function clearAllNotifications(): NotificationItem[] {
  saveNotifications([])
  return []
}

export function resolveNotificationHref(item: NotificationItem, isPaid: boolean) {
  if (item.paidOnly && !isPaid) return "/plans"
  return item.href
}

export function loadSettings(): UserSettings {
  return { ...defaultSettings, ...readJson<Partial<UserSettings>>(SETTINGS_KEY, {}) }
}

export function saveSettings(settings: UserSettings) {
  writeJson(SETTINGS_KEY, settings)
}

export function profileCompleteness(data: {
  fullName?: string
  city?: string
  state?: string
  education?: string
  occupation?: string
  photos?: string[]
  motherTongue?: string
  religion?: string
  caste?: string
  horoscopeName?: string
  prefAgeMin?: number
  prefAgeMax?: number
  height?: string
  diet?: string
  aboutMe?: string
  familyType?: string
  willingToRelocate?: string
  birthTime?: string
  birthPlace?: string
}): number {
  const checks = [
    Boolean(data.fullName),
    Boolean(data.city),
    Boolean(data.state),
    Boolean(data.education),
    Boolean(data.occupation),
    (data.photos?.length ?? 0) >= 1,
    (data.photos?.length ?? 0) >= 3,
    Boolean(data.motherTongue),
    Boolean(data.religion),
    Boolean(data.caste),
    Boolean(data.horoscopeName),
    Boolean(data.prefAgeMin && data.prefAgeMax),
    Boolean(data.height),
    Boolean(data.diet),
    Boolean(data.aboutMe && data.aboutMe.length >= 20),
    Boolean(data.familyType),
    Boolean(data.willingToRelocate),
    Boolean(data.birthTime),
    Boolean(data.birthPlace),
  ]
  return Math.round((checks.filter(Boolean).length / checks.length) * 100)
}
