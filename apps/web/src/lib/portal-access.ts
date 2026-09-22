import {
  type SignupData,
  type VerificationStatus,
} from "@/lib/profile-store"
import {
  getProfileCompleteness,
  getProfileCompletenessStats,
  getMissingRequiredFieldIds,
  getRequiredFieldEditHash,
} from "@/lib/profile-completeness"

export {
  getProfileCompleteness,
  getProfileCompletenessStats,
  getMissingRequiredFieldIds,
  getRequiredFieldEditHash,
}

/**
 * Admin display uses 80% completeness. Member Discover unlock uses the
 * required field set (`requiredComplete`), not this threshold.
 */
export const PROFILE_COMPLETE_THRESHOLD = 80

export function isProfileComplete(data: SignupData | null) {
  return getProfileCompletenessStats(data).requiredComplete
}

/** Discover list renders once required fields are filled (teaser browse). */
export function canBrowseMatches(data: SignupData | null) {
  return isProfileComplete(data)
}

export function isVerified(status: VerificationStatus | undefined) {
  return status === "verified"
}

/** Send interest, chat, unlock contact — requires verified + complete. */
export function canInteract(data: SignupData | null) {
  return Boolean(data && isVerified(data.verificationStatus) && isProfileComplete(data))
}

/** Shortlist stays available once the required profile is complete. */
export function canShortlist(data: SignupData | null) {
  return isProfileComplete(data)
}

/** Ready to promote idle/rejected → pending for admin review. */
export function canSubmitVerification(data: SignupData | null) {
  return Boolean(
    data &&
      isProfileComplete(data) &&
      !isVerified(data.verificationStatus) &&
      data.verificationStatus !== "pending",
  )
}

export function canAccessFullPortal(data: SignupData | null) {
  return canInteract(data)
}

export type OnboardingState =
  | "incomplete"
  | "ready_to_submit"
  | "pending"
  | "rejected"
  | "verified"

export function getOnboardingState(data: SignupData | null): OnboardingState {
  if (!data || !isProfileComplete(data)) return "incomplete"
  const status = data.verificationStatus
  if (status === "verified") return "verified"
  if (status === "pending") return "pending"
  if (status === "rejected") return "rejected"
  return "ready_to_submit"
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
      done: done("education") && done("occupation") && done("annualIncome"),
      href: "/profile/edit#career",
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
      done:
        done("birthTime") &&
        done("birthPlace") &&
        done("star") &&
        done("rashi") &&
        done("manglik"),
      href: "/profile/edit#horoscope",
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
