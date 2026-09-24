"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { getPlanById, type PlanId } from "@/lib/plans"
import { useSubscriptionQuery, useContactUsageQuery, useInterestUsageQuery } from "@/hooks/queries"
import { Check, Lock, Sparkles } from "lucide-react"

const TIER_ORDER: PlanId[] = ["free", "silver", "gold", "platinum", "diamond"]
const RENEWAL_WINDOW_DAYS = 7

const daysRemaining = (date: any) => {
  if (!date) return 0
  const diff = new Date(date).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

const formatExpiry = (date: any) => {
  if (!date) return ""
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

const formatQuotaUsage = (used: number, limit: number | null | undefined) => {
  if (limit == null) return `${used} · Unlimited`
  return `${used} / ${limit}`
}

const shouldShowRenewal = (date: any) => {
  if (!date) return false
  const days = daysRemaining(date)
  return days > 0 && days <= RENEWAL_WINDOW_DAYS
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-secondary/20 bg-secondary/5 p-3 sm:p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  )
}

export function CurrentPlanStatusCard() {
  const router = useRouter()
  const { data: sub } = useSubscriptionQuery()
  const { data: contactUsage } = useContactUsageQuery()
  const { data: interestUsage } = useInterestUsageQuery()

  const currentPlanId: PlanId = React.useMemo(() => {
    if (!sub) return "free"
    const raw = (sub.planSlug || sub.planId || sub.plan?.slug || "free").toString().toLowerCase().trim()
    return TIER_ORDER.includes(raw as PlanId) ? (raw as PlanId) : "free"
  }, [sub])

  const current = getPlanById(currentPlanId)
  const remaining = sub ? daysRemaining(sub.expiresAt) : 0
  const showRenewal = sub ? shouldShowRenewal(sub.expiresAt) : false
  const unlockedLabels = current?.features ?? []

  const choosePlan = () => {
    router.push("/plans")
  }

  return (
    <section className="overflow-hidden rounded-md border border-border bg-card shadow-sm">
      <div className="grid gap-0 md:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4 p-4 md:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-serif text-xl font-bold">Current plan status</h2>
            {showRenewal && (
              <Badge className="border-transparent bg-amber-100 text-amber-900">Renews soon</Badge>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Active plan" value={current?.name ?? "Free"} />
            <Stat
              label="Expires on"
              value={
                current?.id === "free" || current?.id === "diamond"
                  ? current.period
                  : sub
                    ? formatExpiry(sub.expiresAt)
                    : ""
              }
            />
            <Stat label="Days remaining" value={`${remaining} day${remaining === 1 ? "" : "s"}`} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Stat
              label="Connection requests used"
              value={formatQuotaUsage(interestUsage?.used ?? 0, interestUsage?.limit)}
            />
            <Stat
              label="Contact unlocks used"
              value={formatQuotaUsage(contactUsage?.usedThisMonth ?? 0, contactUsage?.limit)}
            />
          </div>
          <div>
            <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Features unlocked</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {unlockedLabels.map((f) => (
                <span
                  key={f}
                  className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-800"
                >
                  <Check className="h-3 w-3" /> {f}
                </span>
              ))}
            </div>
          </div>
          {showRenewal ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
              <p className="font-semibold">Your plan expires in {remaining} days</p>
              <p className="mt-1 text-amber-900/80">
                Renew now to keep contacts, chat, and interests without interruption. Renewal window opens{" "}
                {RENEWAL_WINDOW_DAYS} days before expiry.
              </p>
              <Button size="sm" className="mt-3" onClick={choosePlan}>
                Renew {current?.name}
              </Button>
            </div>
          ) : currentPlanId !== "diamond" ? (
            <Button onClick={choosePlan} size="sm">
              <Sparkles className="mr-2 h-4 w-4" />
              Upgrade Plan
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">You're on the highest plan. Enjoy unlimited access.</p>
          )}
        </div>
        <div className="border-t border-secondary/25 bg-[linear-gradient(160deg,#fff9f2_0%,#f7ead4_55%,#f3e0c8_100%)] p-4 md:border-l md:border-t-0 md:p-6">
          <p className="royal-label">Why upgrade</p>
          <h3 className="mt-2 font-serif text-2xl font-bold text-primary">Locked features convert better than price alone</h3>
          <ul className="mt-4 space-y-2.5 text-sm text-foreground/80">
            {[
              { icon: Lock, text: "Mutual horoscope & contact stay locked on Free" },
              { icon: Lock, text: "Advanced filters & priority listing on Gold+" },
              { icon: Lock, text: "Unlimited interests on Platinum & Diamond" },
            ].map((item: any) => (
              <li key={item.text} className="flex items-start gap-2">
                <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                {item.text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
