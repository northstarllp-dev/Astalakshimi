"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

/** Free 3-month offer: starts 14 Sep 2026, ends 14 Dec 2026 (IST). */
export const FREE_PROFILE_SEARCH_ENDS_AT = new Date("2026-12-14T23:59:59+05:30")

type TimeLeft = {
  days: number
  hours: number
  minutes: number
  seconds: number
  expired: boolean
}

function getTimeLeft(end: Date): TimeLeft {
  const diff = end.getTime() - Date.now()
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true }
  }
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
  const minutes = Math.floor((diff / (1000 * 60)) % 60)
  const seconds = Math.floor((diff / 1000) % 60)
  return { days, hours, minutes, seconds, expired: false }
}

function pad(n: number) {
  return String(n).padStart(2, "0")
}

export function HeroFreeSearchCountdown({
  className,
  compact = false,
}: {
  className?: string
  compact?: boolean
}) {
  const [left, setLeft] = React.useState<TimeLeft>(() => getTimeLeft(FREE_PROFILE_SEARCH_ENDS_AT))

  React.useEffect(() => {
    const id = window.setInterval(() => {
      setLeft(getTimeLeft(FREE_PROFILE_SEARCH_ENDS_AT))
    }, 1000)
    return () => window.clearInterval(id)
  }, [])

  if (left.expired) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/35 px-3 py-1.5 text-xs font-semibold text-white/80 backdrop-blur",
          className
        )}
      >
        Free profile search offer has ended
      </div>
    )
  }

  const units = [
    { label: "Days", value: left.days },
    { label: "Hrs", value: left.hours },
    { label: "Min", value: left.minutes },
    { label: "Sec", value: left.seconds },
  ]

  return (
    <div
      className={cn(
        "rounded-2xl border border-secondary/45 bg-black/40 backdrop-blur-md shadow-lg shadow-black/30",
        compact ? "px-3 py-2.5" : "px-4 py-3",
        className
      )}
    >
      <p
        className={cn(
          "font-semibold tracking-wide text-secondary uppercase",
          compact ? "text-[10px]" : "text-[11px]"
        )}
      >
        Free profile search · 3 months free from 14 Sep
      </p>
      <p className={cn("mt-0.5 text-white/80", compact ? "text-[11px]" : "text-xs")}>
        Offer window ends in
      </p>
      <div className={cn("mt-2 flex items-stretch", compact ? "gap-1.5" : "gap-2")}>
        {units.map((unit, i) => (
          <React.Fragment key={unit.label}>
            <div className="min-w-[3rem] flex-1 rounded-xl border border-white/10 bg-white/10 px-1.5 py-1.5 text-center sm:min-w-[3.25rem]">
              <p
                suppressHydrationWarning
                className={cn(
                  "font-serif font-bold tabular-nums leading-none text-white",
                  compact ? "text-lg" : "text-xl sm:text-2xl"
                )}
              >
                {unit.label === "Days" ? unit.value : pad(unit.value)}
              </p>
              <p className="mt-1 text-[9px] font-semibold tracking-wider text-white uppercase">
                {unit.label}
              </p>
            </div>
            {i < units.length - 1 && (
              <span className="self-center text-sm font-bold text-white">:</span>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}
