import {
  type SignupData,
  type VerificationStatus,
} from "@/lib/profile-store"
import { getProfileCompleteness, getProfileCompletenessStats } from "@/lib/profile-completeness"

export { getProfileCompleteness, getProfileCompletenessStats }

/** Discover / extra matches unlock once the member is ~80% complete (32 of 40 details). */
export const PROFILE_COMPLETE_THRESHOLD = 80

export function isProfileComplete(data: SignupData | null) {
  return getProfileCompleteness(data) >= PROFILE_COMPLETE_THRESHOLD
}

export function canBrowseMatches(data: SignupData | null) {
  return isProfileComplete(data)
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
  const stats = getProfileCompletenessStats(data)
  const done = (id: string) => stats.fields.some((f) => f.id === id && f.done)
  const d = data
  return [
    {
      id: "photos",
      label: "Add photos",
      done: done("photos"),
      href: "/profile/edit",
    },
    {
      id: "career",
      label: "Education & career",
      done: done("education") && done("occupation"),
      href: "/profile/edit",
    },
    {
      id: "about",
      label: "Write about yourself",
      done: done("aboutMe"),
      href: "/profile/edit",
    },
    {
      id: "lifestyle",
      label: "Height & lifestyle",
      done: done("height") && done("diet"),
      href: "/profile/edit",
    },
    {
      id: "horoscope",
      label: "Horoscope details",
      done: done("birthTime") && done("birthPlace"),
      href: "/profile/edit",
    },
    {
      id: "verify",
      label:
        d?.verificationStatus === "rejected"
          ? "Re-upload verification"
          : d?.verificationStatus === "pending"
            ? "Verification in progress"
            : "Get verified",
      done: d?.verificationStatus === "verified",
      href: d?.verificationStatus === "pending" ? "/home" : "/profile/verify",
    },
  ]
}


