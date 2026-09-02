"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn, getMediaUrl } from "@/lib/utils"
import { useSendInterestMutation, useShortlistQuery, useToggleShortlistMutation } from "@/hooks/queries"
import { BadgeCheck, Bookmark, Heart } from "lucide-react"
import { PlanCrownBadge } from "@/components/profile/plan-crown-badge"

import { formatHeightFromCm } from "@/lib/input-units"

function metaLine(parts: Array<string | null | undefined>) {
  return parts.filter((p) => p && String(p).trim()).join(" · ")
}

export function HomeMatchRow({
  match,
  locked,
}: {
  match: any
  locked?: boolean
}) {
  const sendInterest = useSendInterestMutation()
  const { data: shortlistData = [] } = useShortlistQuery()
  const toggleShortlist = useToggleShortlistMutation()
  const [sent, setSent] = React.useState(false)

  const isShortlisted = shortlistData.some((item: any) =>
    typeof item === "string" ? item === match.id : item.id === match.id || item.profileId === match.id
  )

  const photo = match.photos?.[0]
  const height = match.height || formatHeightFromCm(match.heightCm)
  const profession = match.profession || match.occupation
  const education = match.degree || match.education || match.educationLevel
  const community = metaLine([match.religion, match.caste, match.motherTongue])
  const place = metaLine([match.city, match.state])
  const work = metaLine([education, profession])
  const planTier = match.planSlug || match.plan || match.membership

  return (
    <article className="flex gap-2.5 border-b border-border bg-card p-3 last:border-b-0 sm:gap-4 sm:p-4">
      <Link
        href={locked ? "/profile/edit" : `/profiles/${match.id}`}
        className="relative h-[132px] w-[96px] shrink-0 overflow-hidden rounded-md bg-muted sm:h-[168px] sm:w-[128px]"
      >
        {photo ? (
          <Image
            src={getMediaUrl(photo)}
            alt={match.fullName}
            fill
            className={cn(
              "object-cover object-[center_18%]",
              (match.blurPhoto || locked) && "scale-110 blur-[7px]"
            )}
            sizes="(max-width: 640px) 96px, 128px"
          />
        ) : null}
        {match.isVerified || match.photoVerified ? (
          <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-0.5 rounded bg-[#fffbf4]/95 px-1 py-0.5 text-[9px] font-semibold text-foreground shadow-xs sm:text-[10px]">
            <BadgeCheck className="h-3 w-3 text-primary" />
            Verified
          </span>
        ) : null}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-1.5 sm:gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <Link
              href={locked ? "/profile/edit" : `/profiles/${match.id}`}
              className="font-serif text-base font-semibold leading-tight text-foreground hover:text-primary sm:text-xl"
            >
              {match.fullName}
            </Link>
            <PlanCrownBadge plan={planTier} size="sm" />
            <p className="text-xs text-muted-foreground sm:text-sm">
              {match.age} yrs{height ? `, ${height}` : ""}
            </p>
          </div>
          {community ? <p className="mt-0.5 truncate text-xs text-foreground/85 sm:mt-1 sm:text-sm">{community}</p> : null}
          {place ? <p className="truncate text-xs text-muted-foreground sm:text-sm">{place}</p> : null}
          {work ? <p className="truncate text-xs text-muted-foreground sm:text-sm">{work}</p> : null}
          {match.maritalStatus && match.maritalStatus !== "Never Married" ? (
            <p className="mt-0.5 text-[11px] text-muted-foreground sm:text-xs">{match.maritalStatus}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 pt-0.5 sm:gap-2 sm:pt-1">
          <Button
            size="sm"
            className="h-8 flex-1 rounded-md px-2 text-xs shadow-none sm:h-9 sm:flex-initial sm:px-4 sm:text-sm"
            disabled={locked || sent || sendInterest.isPending}
            onClick={() => {
              sendInterest.mutate(match.id, {
                onSuccess: () => setSent(true),
              })
            }}
          >
            <Heart className="mr-1 h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{sent ? "Interest sent" : "Send interest"}</span>
          </Button>
          <Link href={locked ? "/profile/edit" : `/profiles/${match.id}`} className="flex-1 sm:flex-initial">
            <Button size="sm" variant="outline" className="h-8 w-full rounded-md border px-2 text-xs sm:h-9 sm:w-auto sm:px-4 sm:text-sm">
              View
            </Button>
          </Link>
          <button
            type="button"
            disabled={locked || toggleShortlist.isPending}
            aria-label={isShortlisted ? "Remove from shortlist" : "Add to shortlist"}
            onClick={() => toggleShortlist.mutate(match.id)}
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition hover:border-primary hover:text-primary sm:h-9 sm:w-9",
              isShortlisted && "border-primary text-primary"
            )}
          >
            <Bookmark className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4", isShortlisted && "fill-current")} />
          </button>
        </div>
      </div>
    </article>
  )
}
