"use client"

import Image from "next/image"
import { Lock } from "lucide-react"
import { cn, getMediaUrl } from "@/lib/utils"

/**
 * Locked / hidden photo: the real image is shown heavily blurred with a lock
 * overlay. When no src is available, a muted placeholder is used instead.
 */
export function LockedPhoto({
  src,
  className,
  label = "Photo hidden",
  compact = false,
}: {
  src?: string | null
  className?: string
  label?: string
  compact?: boolean
}) {
  const url = src ? getMediaUrl(src) : ""

  return (
    <div
      className={cn("absolute inset-0 overflow-hidden", className)}
      aria-label={label}
      role="img"
    >
      {url ? (
        <>
          <Image
            src={url}
            alt=""
            fill
            draggable={false}
            className="pointer-events-none select-none object-cover object-center blur-2xl scale-[1.2]"
            sizes="(max-width: 768px) 100vw, 400px"
          />
          <div className="absolute inset-0 bg-[#1a0e08]/35" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-muted via-muted/80 to-muted/60" />
      )}
      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-1.5 text-primary">
        <Lock
          className={cn("shrink-0 drop-shadow-sm", compact ? "h-4 w-4" : "h-7 w-7")}
          strokeWidth={1.75}
        />
        {!compact && (
          <span className="px-2 text-center text-xs font-semibold leading-tight drop-shadow-sm sm:text-sm">
            {label}
          </span>
        )}
      </div>
    </div>
  )
}
