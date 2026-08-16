"use client"

import * as React from "react"
import Image from "next/image"
import Link from "next/link"
import { BadgeCheck, ChevronLeft, ChevronRight, Heart, MapPin, Sparkles, Star } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { MatchProfile } from "@/lib/matches"
import { cn } from "@/lib/utils"

export function MatchListCard({
  match,
  featured = false,
  priority = false,
  onSkip,
  onConnect,
}: {
  match: MatchProfile
  featured?: boolean
  priority?: boolean
  onSkip: (id: string) => void
  onConnect?: (id: string) => void
}) {
  const education = match.education.split(/\s+/)[0]?.trim() ?? match.education
  const [connected, setConnected] = React.useState(false)
  const [activePhoto, setActivePhoto] = React.useState(0)
  const [paused, setPaused] = React.useState(false)
  const photos = match.photos

  // Auto-cycle photos every 3 s, pause on hover / touch
  React.useEffect(() => {
    if (photos.length <= 1 || paused) return
    const id = setInterval(() => {
      setActivePhoto((p) => (p + 1) % photos.length)
    }, 3000)
    return () => clearInterval(id)
  }, [photos.length, paused])

  const prevPhoto = (e: React.MouseEvent) => {
    e.preventDefault()
    setActivePhoto((p) => (p - 1 + photos.length) % photos.length)
  }
  const nextPhoto = (e: React.MouseEvent) => {
    e.preventDefault()
    setActivePhoto((p) => (p + 1) % photos.length)
  }

  return (
    <article
      className={cn(
        "overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md",
        featured ? "border-secondary/60 ring-2 ring-secondary/25" : "border-secondary/20"
      )}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setTimeout(() => setPaused(false), 2000)}
    >
      <div className="md:grid md:grid-cols-[minmax(220px,260px)_1fr]">
        {/* ── Photo column ── */}
        <div className="relative">
          <Link
            href={`/profiles/${match.id}`}
            className="relative block aspect-[4/5] overflow-hidden md:aspect-auto md:min-h-[300px]"
          >
            <Image
              src={photos[activePhoto] ?? photos[0]}
              alt={`${match.fullName}, ${match.age}`}
              fill
              priority={priority}
              className="object-cover object-[center_18%] transition-all duration-500"
              sizes="(max-width: 768px) 100vw, 260px"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/15 to-black/20" />

            {/* Top badges */}
            <div className="absolute left-2.5 right-2.5 top-2.5 flex flex-wrap items-start justify-between gap-1.5">
              <div className="flex flex-wrap gap-1.5">
                <Badge className="border-transparent bg-emerald-500 text-[11px] font-bold text-white">
                  <Star className="fill-current" /> {match.matchPercent}%
                </Badge>
                {match.photoVerified && (
                  <Badge
                    variant="outline"
                    className="border-transparent bg-black/50 text-[11px] font-semibold text-white backdrop-blur"
                  >
                    <BadgeCheck className="text-secondary" /> Verified
                  </Badge>
                )}
              </div>
              {featured && (
                <Badge variant="secondary" className="text-[11px] font-bold">
                  <Sparkles /> Top
                </Badge>
              )}
            </div>

            {/* Name overlay */}
            <div className="absolute inset-x-0 bottom-0 p-3 pb-7 text-white md:p-3.5 md:pb-8">
              <h2 className="font-serif text-xl font-bold leading-tight md:text-[1.35rem]">
                {match.fullName}, {match.age}
              </h2>
              <p className="mt-1 flex items-center gap-1 text-xs text-white/90">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{match.city} · {match.community} · {match.height}</span>
              </p>
              <p className="mt-0.5 truncate text-[11px] text-white/75">
                {education} · {match.occupation}
              </p>
            </div>
          </Link>

          {/* Dots sit outside the Link so they are not nested in an <a> */}
          {photos.length > 1 && (
            <div className="absolute bottom-3 left-3 z-10 flex gap-1 md:bottom-3.5 md:left-3.5">
              {photos.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActivePhoto(i)}
                  aria-label={`Photo ${i + 1}`}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    activePhoto === i ? "w-5 bg-white" : "w-1.5 bg-white/45"
                  )}
                />
              ))}
            </div>
          )}

          {/* Prev/Next arrows */}
          {photos.length > 1 && (
            <>
              <button
                type="button"
                onClick={prevPhoto}
                aria-label="Previous photo"
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/70"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={nextPhoto}
                aria-label="Next photo"
                className="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/70"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        {/* ── Details column ── */}
        <div className="flex flex-col justify-between gap-3 p-3.5 sm:p-4">
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            <Detail label="Education" value={match.education} />
            <Detail label="Profession" value={match.occupation} />
            <Detail label="Company" value={match.company} />
            <Detail label="Income" value={match.income} />
            <Detail label="Mother tongue" value={match.motherTongue} />
            <Detail label="Last active" value={match.lastActive} />
          </dl>
          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{match.about}</p>
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
            <Link href={`/profiles/${match.id}`} className="min-w-0">
              <Button variant="outline" size="sm" className="h-10 w-full">View</Button>
            </Link>
            <Button
              size="sm"
              className="h-10"
              disabled={connected}
              onClick={() => { onConnect?.(match.id); setConnected(true) }}
            >
              <Heart className="mr-1 h-3.5 w-3.5 fill-current" />
              {connected ? "Sent" : "Connect"}
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
