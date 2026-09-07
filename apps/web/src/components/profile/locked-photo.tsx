"use client"

import { Lock } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Shown in place of a photo the viewer is not allowed to see.
 *
 * The API now withholds the S3 key entirely when a photo should be blurred, so
 * there is nothing to render and nothing to leak. This placeholder fills the
 * same box the photo would have occupied.
 */
export function LockedPhoto({
  className,
  label = "Photo hidden",
  compact = false,
}: {
  className?: string
  label?: string
  compact?: boolean
}) {
  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-muted via-muted/80 to-muted/60 text-muted-foreground",
        className,
      )}
      aria-label={label}
      role="img"
    >
      <Lock className={cn("shrink-0", compact ? "h-4 w-4" : "h-6 w-6")} strokeWidth={1.75} />
      {!compact && (
        <span className="px-2 text-center text-[10px] font-medium leading-tight sm:text-xs">
          {label}
        </span>
      )}
    </div>
  )
}
