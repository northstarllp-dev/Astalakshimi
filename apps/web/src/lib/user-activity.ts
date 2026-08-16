import { MATCHES } from "@/lib/matches"

const SHORTLIST_KEY = "astalakshimi.shortlist"
const SKIPPED_KEY = "astalakshimi.skipped"
const INTERESTS_SENT_KEY = "astalakshimi.interests.sent"
const INTERESTS_ACCEPTED_KEY = "astalakshimi.interests.accepted"
const SETTINGS_KEY = "astalakshimi.settings"

export type InboxTab = "interests" | "accepted" | "messages"

export type InterestItem = {
  id: string
  profileId: string
  direction: "received" | "sent"
  time: string
  status: "pending" | "accepted"
}

export type MessageThread = {
  id: string
  profileId: string
  preview: string
  time: string
  unread: boolean
}

export type NotificationItem = {
  id: string
  title: string
  time: string
  type: "view" | "interest" | "verification" | "system"
  href?: string
}

export type UserSettings = {
  hideProfile: boolean
  photoVisibility: "all" | "accepted" | "premium"
  notifyEmail: boolean
  notifySms: boolean
  notifyPush: boolean
}

const defaultSettings: UserSettings = {
  hideProfile: false,
  photoVisibility: "all",
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

export function getSentInterests(): InterestItem[] {
  return loadInterestsSent().map((profileId, i) => ({
    id: `sent-${profileId}`,
    profileId,
    direction: "sent" as const,
    time: i === 0 ? "Today" : "This week",
    status: "pending" as const,
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

export function getNotifications(): NotificationItem[] {
  return [
    {
      id: "n1",
      title: "Ananya viewed your profile",
      time: "2h ago",
      type: "view",
      href: "/profiles/am-28-blr",
    },
    {
      id: "n2",
      title: "New interest from Chennai",
      time: "Yesterday",
      type: "interest",
      href: "/inbox",
    },
    {
      id: "n3",
      title: "Verification in progress — photos under review",
      time: "Today",
      type: "verification",
      href: "/profile",
    },
    {
      id: "n4",
      title: "Free 3-month Community Plan starts 14 Sep 2026",
      time: "This week",
      type: "system",
      href: "/plans",
    },
  ]
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
  education?: string
  occupation?: string
  photos?: string[]
  motherTongue?: string
  religion?: string
  horoscopeName?: string
  prefAgeMin?: number
  prefAgeMax?: number
}): number {
  const checks = [
    Boolean(data.fullName),
    Boolean(data.city),
    Boolean(data.education),
    Boolean(data.occupation),
    (data.photos?.length ?? 0) > 0,
    Boolean(data.motherTongue),
    Boolean(data.religion),
    Boolean(data.horoscopeName),
    Boolean(data.prefAgeMin && data.prefAgeMax),
  ]
  return Math.round((checks.filter(Boolean).length / checks.length) * 100)
}
