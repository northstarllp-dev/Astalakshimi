import * as React from "react"
import { Crown } from "lucide-react"
import { cn } from "@/lib/utils"

export type PlanBadgeConfig = {
  tier: "silver" | "gold" | "platinum" | "diamond" | "vip"
  name: string
  label: string
  containerClass: string
  crownClass: string
}

export function getPlanBadgeConfig(plan?: string | null): PlanBadgeConfig | null {
  if (!plan) return null
  const normalized = plan.toLowerCase().trim()

  // For free tier or empty, do not show any crown badge
  if (!normalized || normalized === "free" || normalized === "none" || normalized === "basic") {
    return null
  }

  if (normalized.includes("silver")) {
    return {
      tier: "silver",
      name: "Silver",
      label: "Silver Member",
      containerClass:
        "bg-gradient-to-br from-[#f1f5f9] via-[#94a3b8] to-[#475569] text-white shadow-md border border-white/60 ring-1 ring-slate-400/30",
      crownClass: "text-white fill-white",
    }
  }

  if (normalized.includes("gold")) {
    return {
      tier: "gold",
      name: "Gold",
      label: "Gold Member",
      containerClass:
        "bg-gradient-to-br from-[#fef08a] via-[#eab308] to-[#a16207] text-white shadow-md border border-amber-200/70 ring-1 ring-amber-500/30",
      crownClass: "text-white fill-white",
    }
  }

  if (normalized.includes("platinum")) {
    return {
      tier: "platinum",
      name: "Platinum",
      label: "Platinum Member",
      containerClass:
        "bg-gradient-to-br from-[#e2e8f0] via-[#64748b] to-[#1e293b] text-white shadow-md border border-slate-200/70 ring-1 ring-slate-400/30",
      crownClass: "text-white fill-white",
    }
  }

  if (normalized.includes("diamond")) {
    return {
      tier: "diamond",
      name: "Diamond",
      label: "Diamond Member",
      containerClass:
        "bg-gradient-to-br from-[#a5f3fc] via-[#38bdf8] to-[#6366f1] text-white shadow-md border border-cyan-100/80 ring-1 ring-cyan-400/40",
      crownClass: "text-white fill-white",
    }
  }

  // Fallback for any other paid plan or VIP
  return {
    tier: "vip",
    name: "VIP",
    label: "VIP Member",
    containerClass:
      "bg-gradient-to-br from-[#ff5252] via-[#ff3b30] to-[#c62828] text-white shadow-md border border-white/60",
    crownClass: "text-white fill-white",
  }
}

export function PlanCrownBadge({
  plan,
  className,
  size = "md",
}: {
  plan?: string | null
  className?: string
  size?: "sm" | "md" | "lg"
}) {
  const config = getPlanBadgeConfig(plan)
  if (!config) return null

  const sizeClasses = {
    sm: "h-6 w-6",
    md: "h-7 w-7",
    lg: "h-8 w-8",
  }[size]

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
    lg: "h-4 w-4",
  }[size]

  return (
    <div
      title={config.label}
      aria-label={config.label}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full transition-transform hover:scale-105",
        sizeClasses,
        config.containerClass,
        className
      )}
    >
      <Crown className={cn(iconSizes, config.crownClass)} />
    </div>
  )
}
