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
        "flex min-h-[80px] w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border-2 p-3 text-center transition-all duration-200",
        selected
          ? "border-primary bg-primary/8 text-primary shadow-sm shadow-primary/15"
          : "border-border bg-card text-muted-foreground hover:border-secondary/45 hover:bg-muted/60"
      )}
    >
      {icon && <div className="flex h-6 items-center justify-center text-current">{icon}</div>}
      <span className="text-sm font-semibold tracking-tight">{title}</span>
      {subtitle && <span className="text-[11px] font-normal text-muted-foreground">{subtitle}</span>}
    </button>
  )
}

export function StepHeading({
  kicker,
  title,
  subtitle,
}: {
  kicker?: string
  title: string
  subtitle: string
}) {
  return (
    <div className="space-y-2">
      <div className="ornament-line mb-3 max-w-[10rem] text-[10px] text-secondary">✦</div>
      {kicker && <p className="royal-label">{kicker}</p>}
      <h1 className="font-serif text-[1.85rem] font-bold leading-tight tracking-tight text-foreground md:text-3xl">
        {title}
      </h1>
      <p className="text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
    </div>
  )
}

export function StepProgress({ step, total }: { step: number; total: number }) {
  const pct = (step / total) * 100
  return (
    <div className="flex items-center gap-3">
      <div className="hidden h-1.5 w-32 overflow-hidden rounded-full bg-muted sm:block">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
        {step} / {total}
      </p>
    </div>
  )
}

export function AuthFormCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[1.75rem] border border-secondary/25 bg-card p-5 shadow-[0_8px_32px_rgba(26,14,8,0.06)] sm:p-8",
        className
      )}
    >
      <div className="gold-rule absolute inset-x-0 top-0" />
      {children}
    </div>
  )
}
