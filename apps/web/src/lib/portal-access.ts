import {
  loadProfile,
  saveProfile,
  type SignupData,
  type VerificationStatus,
} from "@/lib/profile-store"

/** Discover / extra matches unlock once the member is ~80% complete. */
export const PROFILE_COMPLETE_THRESHOLD = 80

export function getProfileCompleteness(data: SignupData | null) {
  const actions = getProfileActions(data).filter((a) => a.id !== "verify")
  if (!actions.length) return 0
  return Math.round((actions.filter((a) => a.done).length / actions.length) * 100)
}

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
  const d = data
  return [
    {
      id: "photos",
      label: "Add photos",
      done: (d?.photos.length ?? 0) >= 1 || (d?.photoS3Keys?.length ?? 0) >= 1,
      href: "/profile/edit",
    },
    {
      id: "career",
      label: "Education & career",
      done: Boolean(
        (d?.education || d?.educationLevel || d?.degree) && (d?.occupation || d?.profession)
      ),
      href: "/profile/edit",
    },
    {
      id: "about",
      label: "Write about yourself",
      done: Boolean(d?.aboutMe && d.aboutMe.length >= 20),
      href: "/profile/edit",
    },
    {
      id: "lifestyle",
      label: "Height & lifestyle",
      done: Boolean(d?.height && d?.diet),
      href: "/profile/edit",
    },
    {
      id: "horoscope",
      label: "Horoscope details",
      done: Boolean(d?.birthTime && d?.birthPlace),
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


