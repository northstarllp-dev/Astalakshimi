"use client"

import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function TapCard({
  selected,
  onClick,
  icon,
  title,
  subtitle,
}: {
  selected: boolean
  onClick: () => void
  icon?: ReactNode
  title: string
  subtitle?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-[72px] w-full flex-col items-center justify-center gap-1 rounded-2xl border-2 p-3 text-center transition-all duration-200",
        selected
          ? "border-primary bg-primary/5 text-primary shadow-sm"
          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:bg-muted"
      )}
    >
      {icon && <div className="text-xl leading-none">{icon}</div>}
      <span className="text-sm font-semibold">{title}</span>
      {subtitle && <span className="text-[11px] font-normal text-muted-foreground">{subtitle}</span>}
    </button>
  )
}

export function StepHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="space-y-1.5">
      <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground md:text-[1.75rem]">
        {title}
      </h1>
      <p className="text-sm leading-relaxed text-muted-foreground md:text-base">{subtitle}</p>
    </div>
  )
}

export function StepProgress({ step, total }: { step: number; total: number }) {
  const pct = (step / total) * 100
  return (
    <div className="flex items-center gap-3">
      <div className="hidden h-1.5 w-28 overflow-hidden rounded-full bg-muted sm:block">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Step {step} of {total}
      </p>
    </div>
  )
}
