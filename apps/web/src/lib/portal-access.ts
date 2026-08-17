import { MATCHES, type MatchProfile } from "@/lib/matches"
import {
  loadProfile,
  saveProfile,
  type SignupData,
  type VerificationStatus,
} from "@/lib/profile-store"
import { profileCompleteness } from "@/lib/user-activity"

/** Discover / Interests unlock once the member is verified and ~80% complete. */
export const PROFILE_COMPLETE_THRESHOLD = 80

export function isProfileComplete(data: SignupData | null) {
  if (!data) return false
  return profileCompleteness(data) >= PROFILE_COMPLETE_THRESHOLD
}

export function isVerified(status: VerificationStatus | undefined) {
  return status === "verified"
}

export function canAccessFullPortal(data: SignupData | null) {
  return Boolean(data && isVerified(data.verificationStatus) && isProfileComplete(data))
}

export type ProfileAction = {
  id: string
  label: string
  done: boolean
  href: string
}

export function getProfileActions(data: SignupData | null): ProfileAction[] {
  const d = data
  return [
    {
      id: "photos",
      label: "Add photos",
      done: (d?.photos.length ?? 0) >= 1,
      href: "/profile/edit#photos",
    },
    {
      id: "career",
      label: "Education & career",
      done: Boolean(d?.education && d?.occupation),
      href: "/profile/edit#career",
    },
    {
      id: "about",
      label: "Write about yourself",
      done: Boolean(d?.aboutMe && d.aboutMe.length >= 20),
      href: "/profile/edit#about",
    },
    {
      id: "lifestyle",
      label: "Height & lifestyle",
      done: Boolean(d?.height && d?.diet),
      href: "/profile/edit#basics",
    },
    {
      id: "horoscope",
      label: "Horoscope details",
      done: Boolean(d?.birthTime && d?.birthPlace),
      href: "/profile/edit#horoscope",
    },
    {
      id: "verify",
      label: "Get verified",
      done: d?.verificationStatus === "verified",
      href: "/profile/edit#verification",
    },
  ]
}

export function markProfileVerified(): SignupData | null {
  const profile = loadProfile()
  if (!profile) return null
  const next: SignupData = { ...profile, verificationStatus: "verified" }
  saveProfile(next)
  return next
}

export function getTopMatches(limit = 4): MatchProfile[] {
  return [...MATCHES].sort((a, b) => b.matchPercent - a.matchPercent).slice(0, limit)
}

export type HomeActivityPerson = {
  id: string
  name: string
  photo: string
  subtitle: string
}

export function getWhoViewedYou(): HomeActivityPerson[] {
  return MATCHES.slice(1, 5).map((m, i) => ({
    id: m.id,
    name: m.fullName,
    photo: m.photos[0] ?? "",
    subtitle: i === 0 ? "2h ago" : i === 1 ? "Yesterday" : i === 2 ? "3 days ago" : "This week",
  }))
}

export function getProfilesYouViewed(): HomeActivityPerson[] {
  return MATCHES.slice(2, 6).map((m, i) => ({
    id: m.id,
    name: m.fullName,
    photo: m.photos[0] ?? "",
    subtitle: i === 0 ? "Today" : i === 1 ? "Yesterday" : "This week",
  }))
}

export function getShortlistedYou(): HomeActivityPerson[] {
  return MATCHES.slice(3, 5).map((m, i) => ({
    id: m.id,
    name: m.fullName,
    photo: m.photos[0] ?? "",
    subtitle: i === 0 ? "Yesterday" : "This week",
  }))
}
