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
  Copy,
  Crown,
  Download,
  FileText,
  Gift,
  Lock,
  Share2,
  Sparkles,
  X,
} from "lucide-react"

const TIER_ORDER: PlanId[] = ["free", "silver", "gold", "platinum", "diamond"]
const RENEWAL_WINDOW_DAYS = 7
type InvoiceRecord = any
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

const getOrCreateReferralCode = (name?: string) => {
  const clean = (name || "member").replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase()
  return `ASTA-${clean || "MEMBER"}-2026`
}

const getReferralLink = (code: any) => {
  if (typeof window === "undefined") return `https://astalakshimi.com/register?ref=${code}`
  return `${window.location.origin}/register?ref=${code}`
}

const shouldShowRenewal = (date: any) => {
  if (!date) return false
  const days = daysRemaining(date)
  return days > 0 && days <= RENEWAL_WINDOW_DAYS
}



const getNextBetterPlan = (planId: PlanId): PlanId => {
  const idx = TIER_ORDER.indexOf(planId)
  if (idx === -1 || idx >= TIER_ORDER.length - 1) return "diamond"
  return TIER_ORDER[idx + 1]
}

export default function PlansPage() {
  const router = useRouter()
  const { data: profile } = useProfileQuery()
  const { data: sub } = useSubscriptionQuery()
  const { data: invoices = [] } = useInvoicesQuery()
  const { data: contactUsage } = useContactUsageQuery()
  const { data: interestUsage } = useInterestUsageQuery()
  const [referralCode, setReferralCode] = React.useState("")
  const [referralLink, setReferralLink] = React.useState("")
  const [copied, setCopied] = React.useState(false)

  const currentPlanId: PlanId = React.useMemo(() => {
    if (!sub) return "free"
    const raw = (sub.planSlug || sub.planId || sub.plan?.slug || "free").toString().toLowerCase().trim()
    return TIER_ORDER.includes(raw as PlanId) ? (raw as PlanId) : "free"
  }, [sub])

  const [selectedCompare, setSelectedCompare] = React.useState<PlanId>("silver")

  React.useEffect(() => {
    const code = getOrCreateReferralCode(profile?.fullName || profile?.phone || "member")
    setReferralCode(code)
    setReferralLink(getReferralLink(code))
  }, [profile])

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
  const remaining = sub ? daysRemaining(sub.expiresAt) : 0
  const showRenewal = sub ? shouldShowRenewal(sub.expiresAt) : false
  const previewPlan = getPlanById(selectedCompare)
  const unlockedLabels = current?.features ?? []

  const choosePlan = (planId: PlanId) => {
    const parsed = planSelectSchema.safeParse({ planId })
    if (!parsed.success) return
    router.push(`/checkout?plan=${parsed.data.planId}`)
  }

  const copyReferral = async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  const shareReferral = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Astalakshimi Matrimony",
          text: "Join Astalakshimi  use my link and we both benefit. You get started free; I get 1 month Silver.",
          url: referralLink,
        })
        return
      } catch {
        /* fall through to copy */
      }
    }
    await copyReferral()
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

      <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="grid gap-0 md:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4 p-5 md:p-6">
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
                <Button size="sm" className="mt-3" onClick={() => choosePlan(current?.id ?? "silver")}>
                  Renew {current?.name}
                </Button>
              </div>
            ) : currentPlanId !== "diamond" ? (
              <Button onClick={() => choosePlan(selectedCompare)}>
                <Sparkles className="mr-2 h-4 w-4" />
                {TIER_ORDER.indexOf(selectedCompare) > TIER_ORDER.indexOf(currentPlanId)
                  ? `Upgrade to ${previewPlan?.name}`
                  : `Select ${previewPlan?.name}`}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">You&apos;re on the highest plan. Enjoy unlimited access.</p>
            )}
          </div>
          <div className="border-t border-secondary/25 bg-[linear-gradient(160deg,#fff9f2_0%,#f7ead4_55%,#f3e0c8_100%)] p-5 md:border-l md:border-t-0 md:p-6">
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

      <PlanCompare
        currentPlanId={currentPlanId}
        selectedPlanId={selectedCompare}
        onSelect={setSelectedCompare}
        onChoose={choosePlan}
      />

      {previewPlan && (
        <section className="rounded-3xl border border-border bg-card p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="royal-label">
                {TIER_ORDER.indexOf(previewPlan.id) > TIER_ORDER.indexOf(currentPlanId)
                  ? "Feature unlock preview"
                  : "Plan feature preview"}
              </p>
              <h2 className="mt-1 font-serif text-2xl font-bold">
                {TIER_ORDER.indexOf(previewPlan.id) > TIER_ORDER.indexOf(currentPlanId)
                  ? `You'll unlock with ${previewPlan.name}`
                  : `Features in ${previewPlan.name}`}
              </h2>
            </div>
            {previewPlan.id !== currentPlanId && (
              <Button size="lg" onClick={() => choosePlan(previewPlan.id)}>
                {TIER_ORDER.indexOf(previewPlan.id) > TIER_ORDER.indexOf(currentPlanId)
                  ? `Upgrade to ${previewPlan.name} · ${previewPlan.price}`
                  : `Switch to ${previewPlan.name} · ${previewPlan.price}`}
              </Button>
            )}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {TIER_ORDER.indexOf(previewPlan.id) > TIER_ORDER.indexOf(currentPlanId)
              ? `You'll unlock: ${previewPlan.unlocks.join(" · ")}.`
              : `Included: ${previewPlan.unlocks.join(" · ")}.`}
          </p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {previewPlan.unlocks.map((item: any) => (
              <div
                key={item}
                className="flex items-center gap-3 rounded-2xl border border-border bg-muted/40 px-3 py-3"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Lock className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">{item}</p>
                  <p className="text-[11px] text-muted-foreground">Opens after payment</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

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

      <section className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-secondary/30 bg-[#fff9f2] p-5 md:p-6">
          <div className="flex items-center gap-2 text-primary">
            <Gift className="h-5 w-5" />
            <p className="royal-label">Refer and earn</p>
          </div>
          <h2 className="mt-2 font-serif text-2xl font-bold">Refer a friend → get 1 month Silver free</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Share your unique link. When they complete signup with your code, you earn 1 month of Silver.
          </p>
          <div className="mt-4 rounded-2xl border border-border bg-card p-3">
            <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Your referral code</p>
            <p className="mt-1 font-mono text-lg font-bold text-primary">{referralCode || "…"}</p>
            <p className="mt-2 break-all text-xs text-muted-foreground">{referralLink || "Generating link…"}</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => void shareReferral()}>
              <Share2 className="mr-2 h-4 w-4" /> Share link
            </Button>
            <Button variant="outline" onClick={() => void copyReferral()}>
              <Copy className="mr-2 h-4 w-4" /> {copied ? "Copied" : "Copy link"}
            </Button>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm md:p-6">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="font-serif text-xl font-bold">Invoices</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Download receipts for upgrades and renewals.</p>
          {invoices.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-border px-4 py-8 text-center">
              <p className="text-sm font-medium">No invoices yet</p>
              <p className="mt-1 text-xs text-muted-foreground">They appear here after a successful payment.</p>
              <Button size="sm" variant="soft" className="mt-4" onClick={() => choosePlan("gold")}>
                Upgrade to create one
              </Button>
            </div>
          ) : (
            <ul className="mt-4 space-y-2">
              {invoices.map((inv: any) => (
                <li
                  key={inv?.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border px-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {inv?.planName} · {inv?.amount}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {inv?.id} · {formatExpiry(inv?.paidAt)} · {inv?.method}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadInvoice(inv)}
                    aria-label={`Download ${inv?.id}`}
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-secondary/25 bg-card p-5 md:p-6">
        <h2 className="font-serif text-xl font-bold">Assisted Service</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Prefer a relationship manager? Diamond includes until-marriage access. Brokers and family referrals also get lower subscription options.
        </p>
        <Link href="/#assisted" className="mt-4 inline-block">
          <Button variant="outline" size="sm">
            Know more
          </Button>
        </Link>
      </section>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-muted/40 px-3 py-3">
      <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 font-serif text-lg font-bold">{value}</p>
    </div>
  )
}

function downloadInvoice(inv: InvoiceRecord) {
  const lines = [
    "Astalakshimi Matrimony  Tax Invoice (demo)",
    `Invoice: ${inv?.id}`,
    `Plan: ${inv?.planName}`,
    `Amount: ${inv?.amount}`,
    `Method: ${inv?.method}`,
    `Status: ${inv.status}`,
    `Paid at: ${new Date(inv?.paidAt).toLocaleString("en-IN")}`,
    "",
    "This is a demo invoice generated in the browser.",
  ]
  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${inv?.id}.txt`
  a.click()
  URL.revokeObjectURL(url)
}
