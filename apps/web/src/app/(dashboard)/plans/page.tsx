"use client"

import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { getPlanById, MEMBERSHIP_PLANS, PLAN_FEATURE_MATRIX, CURRENT_PLAN_ID, featureCell, computeAddonPrice, DURATION_ADDONS, PLAN_IDS, type PlanId } from "@/lib/plans"
import { PlanCompare } from "@/components/plans/plan-compare"
import { planSelectSchema } from "@/lib/validation"
import { useProfileQuery, useSubscriptionQuery, useInvoicesQuery, useContactUsageQuery, useInterestUsageQuery } from "@/hooks/queries"
import {
  Check,
  Crown,
  Lock,
  X,
} from "lucide-react"

const TIER_ORDER: PlanId[] = ["free", "silver", "gold", "platinum", "diamond"]

const getNextBetterPlan = (planId: PlanId): PlanId => {
  const idx = TIER_ORDER.indexOf(planId)
  if (idx === -1 || idx >= TIER_ORDER.length - 1) return "diamond"
  return TIER_ORDER[idx + 1]
}

export default function PlansPage() {
  const router = useRouter()
  const { data: profile } = useProfileQuery()
  const { data: sub } = useSubscriptionQuery()

  const currentPlanId: PlanId = React.useMemo(() => {
    if (!sub) return "free"
    const raw = (sub.planSlug || sub.planId || sub.plan?.slug || "free").toString().toLowerCase().trim()
    return TIER_ORDER.includes(raw as PlanId) ? (raw as PlanId) : "free"
  }, [sub])

  const [selectedCompare, setSelectedCompare] = React.useState<PlanId>("silver")

  React.useEffect(() => {
    const nextBetter = getNextBetterPlan(currentPlanId)
    const currIdx = TIER_ORDER.indexOf(currentPlanId)
    const selIdx = TIER_ORDER.indexOf(selectedCompare)

    // When active plan changes or if current selection is <= active plan,
    // automatically select the next higher plan!
    if (selIdx <= currIdx) {
      setSelectedCompare(nextBetter)
    }
  }, [currentPlanId])

  const current = getPlanById(currentPlanId)
  const previewPlan = getPlanById(selectedCompare)

  const choosePlan = (planId: PlanId) => {
    const parsed = planSelectSchema.safeParse({ planId })
    if (!parsed.success) return
    router.push(`/checkout?plan=${parsed.data.planId}`)
  }

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-3 py-5 sm:px-4 md:py-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="royal-label">Subscription & plans</p>
          <h1 className="mt-2 font-serif text-3xl font-bold md:text-4xl">Upgrade when you&apos;re ready</h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">
            See what you unlock before you pay. Feature previews beat a pricing table alone.
          </p>
        </div>
        {current && (
          <Badge className="w-fit border-transparent bg-primary/10 text-primary">
            <Crown className="h-3.5 w-3.5" /> {current.name} plan
          </Badge>
        )}
      </div>



      <PlanCompare
        currentPlanId={currentPlanId}
        selectedPlanId={selectedCompare}
        onSelect={setSelectedCompare}
        onChoose={choosePlan}
      />



      <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4 md:px-6">
          <h2 className="font-serif text-xl font-bold">Full feature comparison</h2>
          <p className="text-sm text-muted-foreground">
            Extra contacts are ₹29 each on Free and Silver after included unlocks. Mutual horoscope & contact unlock on Silver and above.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 font-semibold md:px-6">Feature</th>
                {MEMBERSHIP_PLANS.map((p) => (
                  <th
                    key={p.id}
                    className={`px-3 py-3 text-center font-semibold ${p.id === "gold" ? "text-gold" : ""}`}
                  >
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PLAN_FEATURE_MATRIX.map((row) => (
                <tr key={row.key} className="border-b border-border/70 last:border-0">
                  <td className="px-4 py-3 font-medium md:px-6">{row.label}</td>
                  {TIER_ORDER.map((tier) => {
                    const cell = featureCell(row[tier])
                    return (
                      <td key={tier} className="px-3 py-3 text-center">
                        {cell.type === "yes" && <Check className="mx-auto h-4 w-4 text-emerald-600" />}
                        {cell.type === "no" && <X className="mx-auto h-4 w-4 text-muted-foreground/50" />}
                        {cell.type === "text" && (
                          <span className="text-xs font-medium text-foreground/80">{cell.label}</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

    </main>
  )
}
