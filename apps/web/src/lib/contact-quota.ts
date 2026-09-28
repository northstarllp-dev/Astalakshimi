import { ApiError } from "@/lib/api-client"

export type ContactUsage = {
  planSlug?: string
  limit: number | null
  usedThisMonth: number
  remaining: number | null
  periodLabel?: string | null
  canPayExtra?: boolean
}

export function isContactQuotaExhausted(usage?: ContactUsage | null): boolean {
  if (!usage || usage.limit == null) return false
  const remaining =
    usage.remaining ?? Math.max(0, usage.limit - (usage.usedThisMonth ?? 0))
  return remaining <= 0
}

export function formatContactQuotaUsage(usage?: ContactUsage | null): string {
  if (!usage) return "—"
  if (usage.limit == null) return `${usage.usedThisMonth ?? 0} · Unlimited`
  const period = usage.periodLabel ? ` ${usage.periodLabel}` : " this month"
  const remaining =
    usage.remaining ?? Math.max(0, usage.limit - (usage.usedThisMonth ?? 0))
  if (remaining <= 0) {
    return `${usage.usedThisMonth} / ${usage.limit}${period} · none left`
  }
  return `${usage.usedThisMonth} / ${usage.limit}${period} · ${remaining} left`
}

export function contactQuotaHint(usage?: ContactUsage | null): string | undefined {
  if (!isContactQuotaExhausted(usage)) return undefined
  const limit = usage?.limit
  const slug = (usage?.planSlug || "free").toLowerCase()
  if (slug === "silver") {
    return `You've used all ${limit} contact unlocks this month. Upgrade to Gold for unlimited contacts.`
  }
  if (slug === "gold" || slug === "platinum" || slug === "diamond") return undefined
  return `You've used all ${limit} contact unlocks this month. Pay ₹29 for one more, or upgrade.`
}

export function isContactQuotaError(err: unknown): boolean {
  const message =
    typeof err === "string"
      ? err
      : err instanceof Error
        ? err.message
        : String(err ?? "")
  const status = err instanceof ApiError ? err.status : undefined
  if (status != null && status !== 403) return false
  return /contact unlocks this month/i.test(message)
}
