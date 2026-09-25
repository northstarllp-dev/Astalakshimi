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
    <div className={cn("flex flex-col gap-2", className)}>
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
    <div className={cn("flex flex-col py-2", className)}>
      {children}
    </div>
  )
}
