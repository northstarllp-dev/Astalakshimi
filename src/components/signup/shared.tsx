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
        "flex min-h-[76px] w-full flex-col items-center justify-center gap-1.5 rounded-2xl border-2 p-3 text-center transition-all duration-200",
        selected
          ? "border-primary bg-primary/8 text-primary shadow-sm shadow-primary/15"
          : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:bg-muted/60"
      )}
    >
      {icon && <div className="text-xl leading-none">{icon}</div>}
      <span className="text-sm font-semibold tracking-tight">{title}</span>
      {subtitle && <span className="text-[11px] font-normal text-muted-foreground">{subtitle}</span>}
    </button>
  )
}

export function StepHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="space-y-2">
      {/* Gold ornament */}
      <div className="flex items-center gap-2 mb-4">
        <div className="h-px flex-1 bg-gradient-to-r from-secondary/30 to-transparent" />
        <span className="text-secondary text-xs">✦</span>
        <div className="h-px flex-1 bg-gradient-to-l from-secondary/30 to-transparent" />
      </div>
      <h1 className="font-serif text-2xl font-bold tracking-tight text-foreground md:text-[1.85rem] leading-tight">
        {title}
      </h1>
      <p className="text-sm leading-relaxed text-muted-foreground md:text-[0.9375rem]">{subtitle}</p>
    </div>
  )
}

export function StepProgress({ step, total }: { step: number; total: number }) {
  const pct = (step / total) * 100
  return (
    <div className="flex items-center gap-3">
      <div className="hidden h-1.5 w-32 overflow-hidden rounded-full bg-muted sm:block">
        <div className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
        {step} / {total}
      </p>
    </div>
  )
}
