import * as React from "react"
import { cn } from "@/lib/utils"

export function MatchSnapFeed({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "min-h-0 flex-1 snap-y snap-mandatory overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch]",
        className,
      )}
    >
      {children}
    </div>
  )
}

export function MatchSnapSlide({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex h-full snap-start snap-always flex-col py-2", className)}>
      {children}
    </div>
  )
}
