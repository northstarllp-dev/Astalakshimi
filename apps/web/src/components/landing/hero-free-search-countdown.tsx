"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

/** Free 3-month offer: starts 14 Sep 2026, ends 14 Dec 2026 (IST). */
export const FREE_PROFILE_SEARCH_ENDS_AT = new Date("2026-12-14T23:59:59+05:30")

type TimeLeft = {
  days: number
  hours: number
  minutes: number
  expired: boolean
}

function getTimeLeft(end: Date): TimeLeft {
  const diff = end.getTime() - Date.now()
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, expired: true }
  }
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
  const minutes = Math.floor((diff / (1000 * 60)) % 60)
  return { days, hours, minutes, expired: false }
}

/** Slim maroon promo strip  replaces the Days/Hrs/Min/Sec timeline. */
export function HeroFreeSearchCountdown({ className }: { className?: string }) {
  const [left, setLeft] = React.useState<TimeLeft>(() => getTimeLeft(FREE_PROFILE_SEARCH_ENDS_AT))

  React.useEffect(() => {
    const id = window.setInterval(() => {
      setLeft(getTimeLeft(FREE_PROFILE_SEARCH_ENDS_AT))
    }, 60_000)
    return () => window.clearInterval(id)
  }, [])

  if (left.expired) return null

  return (
    <p
      className={cn(
        "bg-primary px-4 py-2.5 text-center text-[13px] leading-snug text-primary-foreground",
        className
      )}
    >
      <span className="font-semibold">3 months free</span>
      {" from 14 Sep 2026 · "}
      <span suppressHydrationWarning className="tabular-nums">
        {left.days}d {left.hours}h {left.minutes}m left
      </span>
    </p>
  )
}
