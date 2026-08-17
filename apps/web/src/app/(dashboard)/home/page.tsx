"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MatchThumbCard } from "@/components/dashboard/match-thumb-card"
import { CompletenessRing } from "@/components/profile/completeness-ring"
import {
  PROFILE_COMPLETE_THRESHOLD,
  canAccessFullPortal,
  getProfileActions,
  getProfilesYouViewed,
  getShortlistedYou,
  getTopMatches,
  getWhoViewedYou,
} from "@/lib/portal-access"
import { VERIFICATION_SLA_HOURS } from "@/lib/profile-store"
import { profileCompleteness } from "@/lib/user-activity"
import { getMatchById } from "@/lib/matches"
import { useInterestsQuery, useMarkVerifiedMutation, usePaidQuery, useProfileQuery } from "@/hooks/queries"
import { cn } from "@/lib/utils"
import {
  Bookmark,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Compass,
  Eye,
  Heart,
  Lock,
  ShieldCheck,
  Sparkles,
} from "lucide-react"

type ActivityItem = {
  id: string
  name: string
  photo: string
  subtitle: string
}

function ActivityCard({
  title,
  count,
  icon: Icon,
  items,
  locked,
  lockHint,
  href,
}: {
  title: string
  count: number
  icon: React.ElementType
  items: ActivityItem[]
  locked: boolean
  lockHint: string
  href: string
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </span>
          <div>
            <h2 className="text-sm font-semibold">{title}</h2>
            <p className="text-[11px] text-muted-foreground">{count} this week</p>
          </div>
        </div>
        {locked ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
            <Lock className="h-3 w-3" /> Locked
          </span>
        ) : (
          <Link href={href} className="text-xs font-semibold text-primary hover:underline">
            See all
          </Link>
        )}
      </div>
      <div className="relative border-t border-border/70">
        <ul className="flex gap-3 overflow-x-auto px-4 py-3 hide-scrollbar">
          {items.map((item) => (
            <li key={item.id} className="w-16 shrink-0 text-center">
              <div className="relative mx-auto size-14 overflow-hidden rounded-full border-2 border-secondary/30 bg-muted">
                {item.photo ? (
                  <Image
                    src={item.photo}
                    alt={item.name}
                    fill
                    className={cn("object-cover object-[center_18%]", locked && "blur-[6px] scale-110")}
                    sizes="56px"
                  />
                ) : null}
              </div>
              <p className={cn("mt-1 truncate text-[11px] font-medium", locked && "blur-[3px] select-none")}>
                {item.name.split(" ")[0]}
              </p>
            </li>
          ))}
        </ul>
        {locked && (
          <Link
            href={href}
            className="absolute inset-0 flex items-center justify-center bg-card/55 px-4 backdrop-blur-[1px]"
          >
            <p className="rounded-full border border-secondary/40 bg-card/95 px-3 py-1.5 text-center text-xs font-semibold text-foreground shadow-sm">
              {lockHint}
            </p>
          </Link>
        )}
      </div>
    </section>
  )
}

export default function HomePage() {
  const router = useRouter()
  const { data: profile = null } = useProfileQuery()
  const { data: paid = false } = usePaidQuery()
  const { data: interests } = useInterestsQuery()
  const markVerified = useMarkVerifiedMutation()
  const interestCount = interests?.pendingCount ?? 0

  const firstName = profile?.fullName?.split(" ")[0] || "Member"
  const completeness = profile ? profileCompleteness(profile) : 0
  const pending = profile?.verificationStatus === "pending"
  const verified = profile?.verificationStatus === "verified"
  const unlocked = canAccessFullPortal(profile)
  const nextActions = getProfileActions(profile).filter((a) => !a.done).slice(0, 4)
  const topMatches = getTopMatches(4)
  const viewers = getWhoViewedYou()
  const youViewed = getProfilesYouViewed()
  const shortlistedYou = getShortlistedYou()
  const interestPeople = (interests?.received ?? [])
    .filter((i) => i.status === "pending")
    .map((i) => {
      const match = getMatchById(i.profileId)
      return {
        id: i.profileId,
        name: match?.fullName ?? "Member",
        photo: match?.photos[0] ?? "",
        subtitle: i.time,
      }
    })

  return (
    <main className="mx-auto max-w-5xl space-y-5 px-3 py-5 sm:px-4 md:py-8">
      <div>
        <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">Namaste</p>
        <h1 className="mt-0.5 font-serif text-2xl font-bold tracking-tight md:text-3xl">
          Welcome, {firstName}
        </h1>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          {unlocked
            ? "Your matches and activity, in one place."
            : "Your profile is just getting started. Finish it and get verified to open Discover."}
        </p>
      </div>

      {!unlocked && profile && (
        <section className="overflow-hidden rounded-2xl border border-secondary/40 bg-gradient-to-r from-[#fff8ef] to-card p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <CompletenessRing percentage={completeness} size={84} strokeWidth={8} />
            <div className="min-w-0 flex-1">
              <p className="font-serif text-lg font-bold">Profile {completeness}% complete</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Signup is kept short on purpose. Add the rest to reach {PROFILE_COMPLETE_THRESHOLD}% and
                {verified ? " " : " get verified to "}unlock Discover, Interests, and full search.
              </p>
              {nextActions.length > 0 && (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {nextActions.map((action) => (
                    <Link key={action.id} href={action.href}>
                      <Badge variant="outline" className="h-7 font-semibold">
                        {action.label}
                      </Badge>
                    </Link>
                  ))}
                </ul>
              )}
              <Link href="/profile/edit" className="mt-3 inline-block">
                <Button size="sm">
                  Complete profile <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      {unlocked && (
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
            <CheckCircle2 className="h-4 w-4" />
            Profile complete · Verified · Full portal open
          </div>
          <Link href="/dashboard">
            <Button size="sm">
              <Compass className="mr-1.5 h-3.5 w-3.5" /> Open Discover
            </Button>
          </Link>
        </section>
      )}

      {pending && (
        <section className="rounded-2xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-[#fff8ef] p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
              <Clock3 className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-amber-950">Verification under review</p>
              <p className="mt-0.5 text-sm text-amber-900/75">
                Photos stay private until approval — usually within {VERIFICATION_SLA_HOURS} hours.
                Discover and Interests will ask you to complete your profile until you are verified.
              </p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3 border-amber-300 bg-card"
                onClick={() => markVerified.mutate()}
              >
                <ShieldCheck className="mr-1.5 h-3.5 w-3.5" /> Approve now (demo)
              </Button>
            </div>
          </div>
        </section>
      )}

      {!profile && (
        <section className="rounded-2xl border border-dashed border-border bg-card px-4 py-8 text-center">
          <p className="font-semibold">No profile in this session</p>
          <p className="mt-1 text-sm text-muted-foreground">Create a profile to start matching.</p>
          <Button className="mt-4" onClick={() => router.push("/register")}>
            Create profile
          </Button>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">For you</p>
            <h2 className="font-serif text-xl font-bold">Top matches</h2>
            <p className="text-sm text-muted-foreground">Four profiles picked from your preferences.</p>
          </div>
          <Link href="/dashboard" className="text-xs font-semibold text-primary hover:underline">
            See all
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {topMatches.map((match, i) => (
            <MatchThumbCard key={match.id} match={match} priority={i === 0} />
          ))}
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        <ActivityCard
          title="Who viewed you"
          count={viewers.length}
          icon={Eye}
          items={viewers}
          locked={!unlocked || !paid}
          lockHint={!unlocked ? "Complete your profile" : "Premium members see who viewed you"}
          href={!unlocked ? "/profile/edit" : paid ? "/notifications" : "/plans"}
        />
        <ActivityCard
          title="Profiles you viewed"
          count={youViewed.length}
          icon={Compass}
          items={youViewed}
          locked={!unlocked}
          lockHint="Complete your profile"
          href="/dashboard"
        />
        <ActivityCard
          title="Interests received"
          count={interestCount || interestPeople.length}
          icon={Heart}
          items={interestPeople}
          locked={!unlocked}
          lockHint="Complete your profile"
          href="/interests"
        />
        <ActivityCard
          title="Shortlisted you"
          count={shortlistedYou.length}
          icon={Bookmark}
          items={shortlistedYou}
          locked={!unlocked || !paid}
          lockHint={!unlocked ? "Complete your profile" : "Upgrade to see who shortlisted you"}
          href={!unlocked ? "/interests?tab=shortlisted" : paid ? "/interests?tab=shortlisted" : "/plans"}
        />
      </div>

      <Link
        href="/plans"
        className="flex items-center gap-3 rounded-2xl border border-secondary/30 bg-gradient-to-r from-[#fff8ef] to-card p-4 shadow-sm"
      >
        <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Sparkles className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Membership plans</p>
          <p className="text-sm text-muted-foreground">See who viewed you, shortlisted you, and more.</p>
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground" />
      </Link>
    </main>
  )
}
