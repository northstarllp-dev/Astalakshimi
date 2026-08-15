"use client"

import Image from "next/image"
import Link from "next/link"
import { BadgeCheck, Heart, MapPin, Sparkles, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { MatchProfile } from "@/lib/matches"
import { cn } from "@/lib/utils"

export function MatchListCard({
  match,
  featured = false,
  priority = false,
  onSkip,
}: {
  match: MatchProfile
  featured?: boolean
  priority?: boolean
  onSkip: (id: string) => void
}) {
  const education = match.education.split("—")[0].trim()

  return (
    <article
      className={cn(
        "overflow-hidden rounded-2xl border bg-card shadow-sm",
        featured ? "border-secondary/50 ring-1 ring-secondary/25" : "border-secondary/25"
      )}
    >
      <div className="md:grid md:grid-cols-[minmax(168px,220px)_1fr]">
        <Link
          href={`/profile/${match.id}`}
          className="relative block aspect-[3/4] overflow-hidden md:aspect-auto md:min-h-[248px] md:h-full"
        >
          <Image
            src={match.photos[0]}
            alt={`${match.fullName}, ${match.age}`}
            fill
            priority={priority}
            className="object-cover object-[center_18%]"
            sizes="(max-width: 768px) 100vw, 220px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/25" />

          <div className="absolute left-2.5 right-2.5 top-2.5 flex flex-wrap items-start justify-between gap-1.5">
            <div className="flex flex-wrap gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-bold text-white">
                <Star className="h-3 w-3 fill-current" /> {match.matchPercent}%
              </span>
              {match.photoVerified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur">
                  <BadgeCheck className="h-3.5 w-3.5 text-secondary" /> Verified
                </span>
              )}
            </div>
            {featured && (
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold text-secondary-foreground">
                <Sparkles className="h-3 w-3" /> Top
              </span>
            )}
          </div>

          <div className="absolute inset-x-0 bottom-0 p-3 text-white md:p-3.5">
            <h2 className="font-serif text-xl font-bold leading-tight md:text-[1.35rem]">
              {match.fullName}, {match.age}
            </h2>
            <p className="mt-1 flex items-center gap-1 text-xs text-white/90 md:text-sm">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {match.city} · {match.community} · {match.height}
              </span>
            </p>
            <p className="mt-0.5 truncate text-[11px] text-white/75 md:text-xs">
              {education} · {match.occupation}
            </p>
          </div>
        </Link>

        <div className="flex flex-col justify-between gap-3 p-3.5 sm:p-4">
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            <Detail label="Education" value={match.education} />
            <Detail label="Profession" value={match.occupation} />
            <Detail label="Company" value={match.company} />
            <Detail label="Income" value={match.income} />
            <Detail label="Mother tongue" value={match.motherTongue} />
            <Detail label="Last active" value={match.lastActive} />
          </dl>
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{match.about}</p>
          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-10 border border-border"
              onClick={() => onSkip(match.id)}
            >
              Skip
            </Button>
            <Link href={`/profile/${match.id}`} className="min-w-0">
              <Button variant="outline" size="sm" className="h-10 w-full">
                View
              </Button>
            </Link>
            <Button size="sm" className="h-10">
              <Heart className="mr-1 h-3.5 w-3.5 fill-current" /> Connect
            </Button>
          </div>
        </div>
      </div>
    </article>
  )
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="truncate font-medium text-foreground">{value}</dd>
    </div>
  )
}
