import { ApiError } from "@/lib/api-client"

export type InterestUsage = {
  planSlug?: string
  limit: number | null
  used: number
  remaining: number | null
  periodLabel?: string | null
}

export function isInterestQuotaExhausted(usage?: InterestUsage | null): boolean {
  if (!usage || usage.limit == null) return false
  const remaining =
    usage.remaining ?? Math.max(0, usage.limit - (usage.used ?? 0))
  return remaining <= 0
}

export function formatInterestQuotaUsage(usage?: InterestUsage | null): string {
  if (!usage) return "—"
  if (usage.limit == null) return `${usage.used ?? 0} · Unlimited`
  const period = usage.periodLabel ? ` ${usage.periodLabel}` : ""
  const remaining =
    usage.remaining ?? Math.max(0, usage.limit - (usage.used ?? 0))
  if (remaining <= 0) {
    return `${usage.used} / ${usage.limit}${period} · none left`
  }
  return `${usage.used} / ${usage.limit}${period} · ${remaining} left`
}

export function interestQuotaHint(usage?: InterestUsage | null): string | undefined {
  if (!isInterestQuotaExhausted(usage)) return undefined
  const period = usage?.periodLabel || "this period"
  const limit = usage?.limit
  const slug = (usage?.planSlug || "free").toLowerCase()
  if (slug === "free") {
    return `You've used all ${limit} interests ${period}. Upgrade to send more.`
  }
  if (slug === "silver") {
    return `You've used all ${limit} interests ${period}. Upgrade to Gold for 500.`
  }
  if (slug === "gold") {
    return `You've used all ${limit} interests ${period}. Upgrade to Platinum for unlimited.`
  }
  return `You've used all ${limit} interests ${period}. Upgrade your plan to send more.`
}

export function isInterestQuotaError(err: unknown): boolean {
  const message =
    typeof err === "string"
      ? err
      : err instanceof Error
        ? err.message
        : String(err ?? "")
  const status = err instanceof ApiError ? err.status : undefined
  if (status != null && status !== 403) return false
  return /quota|upgrade your plan/i.test(message)
}
