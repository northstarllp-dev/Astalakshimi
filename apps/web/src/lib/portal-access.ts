import {
  loadProfile,
  saveProfile,
  type SignupData,
  type VerificationStatus,
} from "@/lib/profile-store"

/** Discover / Interests unlock once the member is verified and ~80% complete. */
export const PROFILE_COMPLETE_THRESHOLD = 80

export function isProfileComplete(data: SignupData | null) {
  if (!data) return false
  return true
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


