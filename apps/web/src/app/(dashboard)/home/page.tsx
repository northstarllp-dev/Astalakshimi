"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { HomeMatchRow } from "@/components/dashboard/home-match-row"
import { VERIFICATION_SLA_HOURS } from "@/lib/profile-store"
import {
  canAccessFullPortal,
  getProfileActions,
  getProfileCompletenessStats,
  isProfileComplete,
} from "@/lib/portal-access"
import {
  useActivitySummaryQuery,
  useInterestsQuery,
  usePaidQuery,
  useProfileQuery,
  useTopMatchesQuery,
} from "@/hooks/queries"
import { cn, getMediaUrl } from "@/lib/utils"
import { AlertCircle, ChevronRight, Clock3, Lock, ShieldCheck } from "lucide-react"

function InboxTile({
  label,
  count,
  href,
  locked,
  lockHint,
}: {
  label: string
  count: number
  href: string
  locked?: boolean
  lockHint?: string
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className="flex min-h-[76px] flex-col justify-center border-border px-3 py-3 odd:border-r [&:nth-child(-n+2)]:border-b hover:bg-muted/40 sm:px-4 md:border-b-0 md:border-r md:last:border-r-0"
    >
      <p className="font-serif text-2xl font-semibold leading-none tabular-nums text-primary sm:text-[1.75rem]">
        {locked ? "–" : count}
      </p>
      <p className="mt-1.5 flex items-center gap-1 text-[12px] leading-snug text-muted-foreground">
        {locked ? <Lock className="h-3 w-3 shrink-0" aria-hidden /> : null}
        {locked ? lockHint || label : label}
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

  const firstName = profile?.fullName?.split(" ")[0] || "Member"
  const lookingFor =
    profile?.gender === "Female" ? "grooms" : profile?.gender === "Male" ? "brides" : "matches"
  const pending = profile?.verificationStatus === "pending"
  const verified = profile?.verificationStatus === "verified"
  const rejected = profile?.verificationStatus === "rejected"
  const rejectionReason =
    profile?.rejectionReason || "Your verification documents could not be approved."
  const unlocked = canAccessFullPortal(profile)
  const canSeeMore = isProfileComplete(profile)
  const actions = getProfileActions(profile)
  const completenessStats = getProfileCompletenessStats(profile)
  const completeness = completenessStats.percentage
  const nextActions = actions.filter((a) => !a.done).slice(0, 3)
  const allMatches = topMatchesData || []
  const previewMatches = allMatches.slice(0, 3)

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
  const interestCount = interests?.pendingCount ?? interestPeople.length

  return (
    <main className="mx-auto max-w-6xl px-3 py-4 sm:px-4 md:py-6">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
          <div className="min-w-0 space-y-4">
            <div className="flex items-center gap-3">
              {profile?.photos?.[0] ? (
                <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border">
                  <Image
                    src={getMediaUrl(profile.photos[0])}
                    alt=""
                    fill
                    className={cn("object-cover object-[center_18%]", pending && "blur-[2px]")}
                    sizes="48px"
                  />
                </span>
              ) : null}
              <div className="min-w-0">
                <h1 className="font-serif text-2xl font-semibold leading-tight md:text-[1.75rem]">
                  How {lookingFor} appear to you
                </h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  A short preview of three profiles. Fill required details to see the rest
                  {firstName !== "Member" ? `, ${firstName}` : ""}.
                </p>
              </div>
            </div>

            {pending ? (
              <div className="flex items-start gap-3 border border-[#e8d4a8] bg-[#fff8ef] px-3 py-3 sm:px-4">
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-[#8a6a12]" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">Verification under review</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Photos stay private until approval — usually within {VERIFICATION_SLA_HOURS} hours.
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

            <section className="grid grid-cols-2 overflow-hidden rounded-md border border-border bg-card md:grid-cols-4">
              <InboxTile
                label="Interests received"
                count={interestCount}
                href="/interests"
                locked={!unlocked}
                lockHint="Complete profile"
              />
              <InboxTile
                label="Who viewed you"
                count={viewers.length}
                href={paid ? "/notifications" : "/plans"}
                locked={!unlocked || !paid}
                lockHint={!paid ? "Premium" : "Complete profile"}
              />
              <InboxTile
                label="Shortlisted you"
                count={shortlistedYou.length}
                href={paid ? "/interests?tab=shortlisted" : "/plans"}
                locked={!unlocked || !paid}
                lockHint={!paid ? "Premium" : "Complete profile"}
              />
              <InboxTile
                label="You viewed"
                count={youViewed.length}
                href="/dashboard"
                locked={!unlocked}
                lockHint="Complete profile"
              />
            </section>

            <section className="overflow-hidden rounded-md border border-border bg-card">
              <div className="flex items-center justify-between border-b border-border px-3 py-2.5 sm:px-4">
                <div>
                  <h2 className="font-serif text-lg font-semibold">Your top matches</h2>
                </div>
                {canSeeMore ? (
                  <Link href="/dashboard" className="shrink-0 text-sm font-semibold text-primary hover:underline">
                    See all
                  </Link>
                ) : (
                  <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                    {completenessStats.requiredFilled}/{completenessStats.requiredTotal} required
                  </span>
                )}
              </div>

              {matchesLoading ? (
                <div className="space-y-0">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex gap-3 border-b border-border p-4 last:border-b-0">
                      <div className="h-[148px] w-[112px] shrink-0 animate-pulse rounded-md bg-muted" />
                      <div className="flex-1 space-y-2 py-1">
                        <div className="h-5 w-40 animate-pulse rounded bg-muted" />
                        <div className="h-4 w-56 animate-pulse rounded bg-muted" />
                        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : previewMatches.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <p className="text-sm font-semibold">No profiles found</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Finish a few details so we can show how your matches will appear here.
                  </p>
                  <Link href="/profile/edit" className="mt-4 inline-block">
                    <Button size="sm" className="rounded-md">
                      Complete profile
                    </Button>
                  </Link>
                </div>
              ) : (
                <>
                  <ul>
                    {previewMatches.map((match: any) => (
                      <li key={match.id}>
                        <HomeMatchRow match={match} />
                      </li>
                    ))}
                  </ul>
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
          </aside>
        </div>
    </main>
  )
}
