"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn, getMediaUrl } from "@/lib/utils"
import { useSendInterestMutation, useShortlistQuery, useToggleShortlistMutation } from "@/hooks/queries"
import { BadgeCheck, Bookmark, Heart } from "lucide-react"

function formatHeight(cm?: number | string | null) {
  const n = Number(cm)
  if (!n || Number.isNaN(n)) return ""
  const totalInches = n / 2.54
  const feet = Math.floor(totalInches / 12)
  const inches = Math.round(totalInches % 12)
  return `${feet}'${inches}"`
}

function metaLine(parts: Array<string | undefined | null>) {
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
  const height = match.height || formatHeight(match.heightCm)
  const profession = match.profession || match.occupation
  const education = match.degree || match.education || match.educationLevel
  const community = metaLine([match.religion, match.caste, match.motherTongue])
  const place = metaLine([match.city, match.state])
  const work = metaLine([education, profession])

  return (
    <article className="flex gap-3 border-b border-border bg-card p-3 last:border-b-0 sm:gap-4 sm:p-4">
      <Link
        href={locked ? "/profile/edit" : `/profiles/${match.id}`}
        className="relative h-[148px] w-[112px] shrink-0 overflow-hidden rounded-md bg-muted sm:h-[168px] sm:w-[128px]"
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
            sizes="128px"
          />
        ) : null}
        {match.isVerified || match.photoVerified ? (
          <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-0.5 rounded bg-[#fffbf4] px-1 py-0.5 text-[10px] font-semibold text-foreground">
            <BadgeCheck className="h-3 w-3 text-primary" />
            Verified
          </span>
        ) : null}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <Link
              href={locked ? "/profile/edit" : `/profiles/${match.id}`}
              className="font-serif text-lg font-semibold leading-tight text-foreground hover:text-primary sm:text-xl"
            >
              {match.fullName}
            </Link>
            <p className="text-sm text-muted-foreground">
              {match.age} yrs{height ? `, ${height}` : ""}
            </p>
          </div>
          {community ? <p className="mt-1 truncate text-sm text-foreground/80">{community}</p> : null}
          {place ? <p className="truncate text-sm text-muted-foreground">{place}</p> : null}
          {work ? <p className="truncate text-sm text-muted-foreground">{work}</p> : null}
          {match.maritalStatus && match.maritalStatus !== "Never Married" ? (
            <p className="mt-0.5 text-xs text-muted-foreground">{match.maritalStatus}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            className="h-9 rounded-md px-4 shadow-none"
            disabled={locked || sent || sendInterest.isPending}
            onClick={() => {
              sendInterest.mutate(match.id, {
                onSuccess: () => setSent(true),
              })
            }}
          >
            <Heart className="mr-1.5 h-3.5 w-3.5" />
            {sent ? "Interest sent" : "Send interest"}
          </Button>
          <Link href={locked ? "/profile/edit" : `/profiles/${match.id}`}>
            <Button size="sm" variant="outline" className="h-9 rounded-md border px-4">
              View profile
            </Button>
          </Link>
          <button
            type="button"
            disabled={locked || toggleShortlist.isPending}
            aria-label={isShortlisted ? "Remove from shortlist" : "Add to shortlist"}
            onClick={() => toggleShortlist.mutate(match.id)}
            className={cn(
              "inline-flex h-9 items-center gap-1 rounded-md border px-2.5 text-xs font-semibold transition-colors",
              isShortlisted
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
            )}
          >
            <Bookmark className={cn("h-3.5 w-3.5", isShortlisted && "fill-current")} />
            <span className="hidden sm:inline">{isShortlisted ? "Shortlisted" : "Shortlist"}</span>
          </button>
        </div>
      </div>
    </article>
  )
}
