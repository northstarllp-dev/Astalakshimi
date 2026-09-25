"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { LockedPhoto } from "@/components/profile/locked-photo"
import { VERIFICATION_SLA_HOURS, getPrimaryPhotoSrc } from "@/lib/profile-store"
import {
  canAccessFullPortal,
  canInteract,
  canShortlist,
  getOnboardingState,
  getProfileActions,
  getProfileCompletenessStats,
  isProfileComplete,
} from "@/lib/portal-access"
import {
  useActivitySummaryQuery,
  useInterestsQuery,
  usePaidQuery,
  useProfileQuery,
  useSubmitVerificationMutation,
  useTopMatchesQuery,
} from "@/hooks/queries"
import { cn, getMediaUrl } from "@/lib/utils"
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Compass,
  Crown,
  Lock,
  Shield,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import { CurrentPlanStatusCard } from "@/components/dashboard/current-plan-status-card"

function InboxTile({
  label,
  profiles,
  href,
  locked,
  lockHint,
}: {
  label: string
  profiles: any[]
  href: string
  locked?: boolean
  lockHint?: string
}) {
  const displayProfiles = profiles.slice(0, 3)
  const remaining = Math.max(0, profiles.length - 3)

  return (
    <Link
      href={href}
      prefetch={false}
      className={cn(
        "relative flex min-h-[76px] flex-col justify-center border-border px-3 py-3 odd:border-r [&:nth-child(-n+2)]:border-b hover:bg-muted/40 sm:px-4 md:border-b-0 md:border-r md:last:border-r-0",
        locked && "opacity-90"
      )}
    >
      {locked && (
        <div className="absolute right-2 top-2 z-20 flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
          <Lock className="h-2.5 w-2.5" />
          {lockHint}
        </div>
      )}
      <div className={cn("flex h-8 items-center", locked && "blur-[3px]")}>
        {displayProfiles.length > 0 ? (
          <div className="flex -space-x-2">
            {displayProfiles.map((p, i) => {
              const photoUrl = p.photo ? getMediaUrl(p.photo) : (p.photos?.[0] ? getMediaUrl(p.photos[0]) : "")
              const name = p.name || p.fullName || "M"
              return (
                <div key={p.id || i} className="relative h-8 w-8 overflow-hidden rounded-full border-2 border-background bg-muted">
                  {photoUrl ? (
                    <Image src={photoUrl} alt={name} fill className="object-cover" sizes="32px" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center bg-primary/10 text-[10px] font-semibold text-primary">
                      {name.charAt(0)}
                    </span>
                  )}
                </div>
              )
            })}
            {remaining > 0 && (
              <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-muted text-[10px] font-medium text-muted-foreground">
                +{remaining}
              </div>
            )}
          </div>
        ) : (
          <p className="font-serif text-2xl font-semibold leading-none text-primary sm:text-[1.75rem]">
            0
          </p>
        )}
      </div>
      <p className={cn("mt-1.5 text-[12px] leading-snug text-muted-foreground font-medium", locked && "opacity-80")}>
        {label}
      </p>
    </Link>
  )
}

export default function HomePage() {
  const router = useRouter()
  const { data: profile = null, isLoading: profileLoading } = useProfileQuery()
  const { data: paid = false } = usePaidQuery()
  const { data: interests } = useInterestsQuery()
  const { data: topMatchesData, isLoading: matchesLoading } = useTopMatchesQuery()
  const { data: activitySummary } = useActivitySummaryQuery()
  const carouselRef = React.useRef<HTMLDivElement>(null)

  const scrollCarousel = React.useCallback((direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = direction === 'left' ? -(carouselRef.current.clientWidth - 50) : (carouselRef.current.clientWidth - 50)
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }, [])
  const submitVerification = useSubmitVerificationMutation()

  const firstName = profile?.fullName?.split(" ")[0] || "Member"
  const primaryPhotoSrc = getPrimaryPhotoSrc(profile)
  const lookingFor =
    profile?.gender === "Female" ? "grooms" : profile?.gender === "Male" ? "brides" : "matches"
  const onboardingState = getOnboardingState(profile)
  const pending = onboardingState === "pending"
  const verified = onboardingState === "verified"
  const rejected = onboardingState === "rejected"
  const readyToSubmit = onboardingState === "ready_to_submit"
  const incomplete = onboardingState === "incomplete"
  const rejectionReason =
    profile?.rejectionReason || "Your verification documents could not be approved."
  const unlocked = canAccessFullPortal(profile)
  const interactionsLocked = !canInteract(profile)
  const canSeeMore = isProfileComplete(profile)
  const actions = getProfileActions(profile)
  const completenessStats = getProfileCompletenessStats(profile)
  const completeness = completenessStats.percentage
  const nextActions = actions.filter((a) => !a.done).slice(0, 3)
  const allMatches = topMatchesData || []

  const viewers = activitySummary?.viewers || []
  const youViewed = activitySummary?.youViewed || []
  const shortlistedYou = activitySummary?.shortlistedYou || []
  const interestPeople =
    activitySummary?.interestsReceived?.length > 0
      ? activitySummary.interestsReceived
      : (interests?.received ?? [])
          .filter((i: any) => i.status === "pending")
          .map((i: any) => ({
            id: i.profileId,
            name: i.profile?.fullName ?? "Member",
            photo: i.profile?.photo ?? "",
            subtitle: i.time,
          }))

  return (
    <main className="mx-auto max-w-6xl px-3 py-4 sm:px-4 md:py-6">
      <div className="mb-5 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          {primaryPhotoSrc ? (
            <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border">
              <Image
                src={getMediaUrl(primaryPhotoSrc)}
                alt=""
                fill
                className={cn("object-cover object-[center_18%]", pending && "blur-[2px]")}
                sizes="48px"
              />
            </span>
          ) : null}
          <div className="min-w-0">
            <h1 className="font-serif text-2xl font-semibold leading-tight md:text-[1.75rem]">
              Your Top Matches
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              A curated list of your best potential matches. Complete your profile to unlock more recommendations
              {firstName !== "Member" ? `, ${firstName}` : ""}.
            </p>
          </div>
        </div>

        {incomplete ? (
          <div className="flex items-start gap-3 border border-[#e8d4a8] bg-[#fff8ef] px-3 py-3 sm:px-4">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#8a6a12]" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">Complete your profile</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Fill every required detail to unlock interests and messaging.
              </p>
              <Link href="/profile/edit" className="mt-2 inline-block">
                <Button size="sm" className="h-8 rounded-md">
                  Complete profile
                </Button>
              </Link>
            </div>
          </div>
        ) : null}



        {pending ? (
          <div className="flex items-start gap-3 border border-[#e8d4a8] bg-[#fff8ef] px-3 py-3 sm:px-4">
            <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-[#8a6a12]" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">Verification under review</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                You can browse and shortlist. Interests and messaging unlock after approval — usually within{" "}
                {VERIFICATION_SLA_HOURS} hours.
              </p>
            </div>
          </div>
        ) : null}

        {rejected ? (
          <div className="flex items-start gap-3 border border-destructive/25 bg-destructive/5 px-3 py-3 sm:px-4">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-destructive">Verification rejected</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{rejectionReason}</p>
              <Link href="/profile/verify" className="mt-2 inline-block">
                <Button size="sm" className="h-8 rounded-md">
                  Re-upload selfie / ID
                </Button>
              </Link>
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
        <div className="min-w-0 space-y-4">

            <section className="overflow-hidden rounded-md border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-3 py-2.5 sm:px-4">
                <div>
                  <h2 className="font-serif text-lg font-semibold">Your top matches</h2>
                </div>
                {canSeeMore ? (
                  <Link href="/dashboard?view=matches" className="shrink-0 text-sm font-semibold text-primary hover:underline">
                    See all
                  </Link>
                ) : (
                  <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                    {completenessStats.requiredFilled}/{completenessStats.requiredTotal} required
                  </span>
                )}
              </div>

              {matchesLoading ? (
                <div className="flex gap-4 overflow-x-auto p-4 snap-x snap-mandatory scroll-px-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex w-[150px] shrink-0 snap-start flex-col rounded-xl border border-border bg-card p-2 sm:w-[170px]">
                      <div className="h-[160px] w-full animate-pulse rounded-md bg-muted sm:h-[180px]" />
                      <div className="mt-3 flex flex-col items-center space-y-2">
                        <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                        <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                      </div>
                    </div>
                  ))}
                  <div className="w-px shrink-0" aria-hidden="true" />
                </div>
              ) : allMatches.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <p className="text-sm font-semibold">
                    {!(profile?.prefReligion?.length) ||
                    !(profile?.prefMaritalStatuses?.length) ||
                    typeof profile?.prefAgeMin !== "number" ||
                    typeof profile?.prefAgeMax !== "number"
                      ? "Set who you are looking for"
                      : "No profiles found"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Choose an age range, religion, and marital status so we can show people who fit.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <Link href="/profile/edit#preferences">
                      <Button size="sm" className="rounded-md">
                        Edit preferences
                      </Button>
                    </Link>
                    <Link href="/dashboard?view=search">
                      <Button size="sm" variant="outline" className="rounded-md">
                        Browse all profiles
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  <div className="relative group/carousel">
                    <div ref={carouselRef} className="flex gap-4 overflow-x-auto p-4 snap-x snap-mandatory scroll-px-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                      {allMatches.slice(0, 10).map((match: any) => {
                        const photo = match.photos?.[0]
                        const isHidden = match.blurPhoto || !photo || incomplete
                        const profileHref = incomplete ? "/profile/edit" : `/profiles/${match.id}`
                        return (
                          <Link
                            key={match.id}
                            href={profileHref}
                            className="group relative flex h-[220px] w-[150px] shrink-0 snap-start flex-col overflow-hidden rounded-xl bg-muted shadow-sm transition-all hover:shadow-md sm:h-[240px] sm:w-[170px]"
                          >
                            {photo && !isHidden ? (
                              <Image
                                src={getMediaUrl(photo)}
                                alt={match.fullName}
                                fill
                                className="object-cover object-[center_18%] transition-transform duration-300 group-hover:scale-105"
                                sizes="(max-width: 640px) 150px, 170px"
                              />
                            ) : (
                              <LockedPhoto compact src={photo} label="Photo hidden" />
                            )}
                            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                            <div className="absolute inset-x-0 bottom-0 flex flex-col p-3 text-white">
                              <p className="w-full truncate font-serif text-base font-semibold leading-tight drop-shadow-md">
                                {match.fullName}
                              </p>
                              <p className="mt-0.5 w-full truncate text-[11.5px] text-white/90 drop-shadow-md sm:text-xs">
                                {match.age} yrs {match.city ? `· ${match.city}` : ""}
                              </p>
                              {Array.isArray(match.matchReasons) && match.matchReasons.length > 0 && (
                                <p className="mt-1 w-full truncate text-[11px] text-white/80 drop-shadow-md">
                                  {match.matchReasons.slice(0, 3).join(" · ")}
                                </p>
                              )}
                            </div>
                          </Link>
                        )
                      })}
                      <div className="w-px shrink-0" aria-hidden="true" />
                    </div>
                    {allMatches.length > 4 && (
                      <>
                        <button
                          type="button"
                          onClick={() => scrollCarousel('left')}
                          className="absolute z-10 left-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background/95 text-foreground opacity-0 shadow-sm backdrop-blur transition-all hover:bg-muted group-hover/carousel:opacity-100"
                          aria-label="Scroll left"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => scrollCarousel('right')}
                          className="absolute z-10 right-2 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background/95 text-foreground opacity-0 shadow-sm backdrop-blur transition-all hover:bg-muted group-hover/carousel:opacity-100"
                          aria-label="Scroll right"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                  {!canSeeMore ? (
                    <div className="border-t border-border bg-[#fff8ef] px-4 py-4 text-center sm:px-5">
                      <p className="font-serif text-base font-semibold">More {lookingFor} are waiting</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Fill every required detail to unlock Discover and see every matching profile — not just this
                        preview. Specialization and employer are optional.
                      </p>
                      <Link
                        href={
                          completenessStats.missingRequired.some((f) => f.group === "career")
                            ? "/profile/edit#career"
                            : "/profile/edit"
                        }
                        className="mt-3 inline-block"
                      >
                        <Button size="sm" className="rounded-md">
                          Complete profile to see more
                        </Button>
                      </Link>
                    </div>
                  ) : null}
                </>
              )}
            </section>

            <section className="grid grid-cols-2 overflow-hidden rounded-md border border-border bg-card md:grid-cols-4">
              <InboxTile
                label="Interests received"
                profiles={interestPeople}
                href="/interests"
                locked={!unlocked}
                lockHint={incomplete ? "Complete profile" : "Under review"}
              />
              <InboxTile
                label="Who viewed you"
                profiles={viewers}
                href={paid ? "/notifications" : "/plans"}
                locked={!unlocked || !paid}
                lockHint={!paid ? "Premium" : incomplete ? "Complete profile" : "Under review"}
              />
              <InboxTile
                label="Shortlisted you"
                profiles={shortlistedYou}
                href={paid ? "/interests?tab=shortlisted" : "/plans"}
                locked={!unlocked || !paid}
                lockHint={!paid ? "Premium" : incomplete ? "Complete profile" : "Under review"}
              />
              <InboxTile
                label="You viewed"
                profiles={youViewed}
                href="/dashboard"
                locked={!unlocked}
                lockHint={incomplete ? "Complete profile" : "Under review"}
              />
            </section>
            
            <CurrentPlanStatusCard />

          </div>

          <aside className="space-y-4 lg:sticky lg:top-20">
            <section className="overflow-hidden rounded-md border border-border bg-card">
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-semibold">Your profile</p>
              </div>
              <div className="px-4 py-3">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">Completeness</span>
                  <span className="font-semibold tabular-nums">{completeness}%</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {completenessStats.filled} of {completenessStats.total} details filled
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.min(100, completeness)}%` }}
                  />
                </div>
                {verified ? (
                  <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                    Photo verified
                  </p>
                ) : rejected ? (
                  <p className="mt-2 text-xs text-destructive">
                    Verification rejected — re-upload required
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {pending ? "Verification in progress" : "Get verified to appear higher in search"}
                  </p>
                )}
                {nextActions.length > 0 ? (
                  <ul className="mt-3 space-y-1.5">
                    {nextActions.map((action) => (
                      <li key={action.id}>
                        <Link
                          href={action.href}
                          className="flex items-center justify-between text-sm text-primary hover:underline"
                        >
                          {action.label}
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    {canSeeMore
                      ? "You can now browse all matching profiles."
                      : "Fill required details to unlock Discover."}
                  </p>
                )}
                <Link href="/profile/edit" className="mt-3 block">
                  <Button variant="outline" size="sm" className="w-full rounded-md">
                    Edit profile
                  </Button>
                </Link>
              </div>
            </section>


            {/* Trust & Safety Guarantee */}
            <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2 text-primary">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <h3 className="font-serif text-sm font-bold text-foreground">100% Verified Community</h3>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
                Manual identity screening & photo verification protect your privacy. Genuine profiles only.
              </p>
            </section>
          </aside>
        </div>
    </main>
  )
}
