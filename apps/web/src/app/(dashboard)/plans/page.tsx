"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { loadProfile } from "@/lib/profile-store"
import {
  MEMBERSHIP_PLANS,
  PLAN_FEATURE_MATRIX,
  RENEWAL_WINDOW_DAYS,
  daysRemaining,
  featureCell,
  formatExpiry,
  getOrCreateReferralCode,
  getPlanById,
  getReferralLink,
  loadInvoices,
  loadSubscription,
  shouldShowRenewal,
  type InvoiceRecord,
  type PlanId,
  type SubscriptionRecord,
} from "@/lib/plans"
import { cn } from "@/lib/utils"
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

const TIER_ORDER: PlanId[] = ["free", "silver", "gold", "platinum"]

export default function PlansPage() {
  const [sub, setSub] = React.useState<SubscriptionRecord | null>(null)
  const [invoices, setInvoices] = React.useState<InvoiceRecord[]>([])
  const [referralCode, setReferralCode] = React.useState("")
  const [referralLink, setReferralLink] = React.useState("")
  const [copied, setCopied] = React.useState(false)
  const [selectedCompare, setSelectedCompare] = React.useState<PlanId>("gold")

  React.useEffect(() => {
    const profile = loadProfile()
    const subscription = loadSubscription()
    const code = getOrCreateReferralCode(profile?.fullName || profile?.phone || "member")
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSub(subscription)
    setInvoices(loadInvoices())
    setReferralCode(code)
    setReferralLink(getReferralLink(code))
    if (subscription.planId !== "platinum") {
      const next = TIER_ORDER[Math.min(TIER_ORDER.indexOf(subscription.planId) + 1, TIER_ORDER.length - 1)]
      setSelectedCompare(next === "free" ? "silver" : next)
    }
  }, [])

  const current = sub ? getPlanById(sub.planId) : getPlanById("free")
  const remaining = sub ? daysRemaining(sub.expiresAt) : 0
  const showRenewal = sub ? shouldShowRenewal(sub.expiresAt) : false
  const previewPlan = getPlanById(selectedCompare)
  const unlockedLabels = current?.features ?? []

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
          text: "Join Astalakshimi — use my link and we both benefit. You get started free; I get 1 month Silver.",
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
          <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">Subscription & plans</p>
          <h1 className="mt-1 font-serif text-3xl font-bold md:text-4xl">Upgrade when you&apos;re ready</h1>
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

      {/* Current plan status */}
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
              <Stat label="Expires on" value={sub ? formatExpiry(sub.expiresAt) : "—"} />
              <Stat label="Days remaining" value={`${remaining} day${remaining === 1 ? "" : "s"}`} />
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
                <Link href={`/checkout?plan=${current?.id ?? "silver"}&renew=1`} className="mt-3 inline-block">
                  <Button size="sm">Renew {current?.name}</Button>
                </Link>
              </div>
            ) : current?.id !== "platinum" ? (
              <Link href={`/checkout?plan=${selectedCompare}`}>
                <Button>
                  <Sparkles className="mr-2 h-4 w-4" /> Upgrade to {previewPlan?.name}
                </Button>
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">You&apos;re on the highest plan. Enjoy unlimited access.</p>
            )}
          </div>
          <div className="border-t border-border bg-gradient-to-br from-[#2a0f14] via-[#6b1024] to-primary p-5 text-white md:border-l md:border-t-0 md:p-6">
            <p className="text-xs font-semibold tracking-[0.18em] uppercase text-white/60">Why upgrade</p>
            <h3 className="mt-2 font-serif text-2xl font-bold">Locked features convert better than price alone</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-white/85">
              {[
                { icon: Lock, text: "Contact details stay locked on Free" },
                { icon: Lock, text: "Chat unlocks after mutual interest on paid plans" },
                { icon: Lock, text: "Advanced filters & horoscope on Gold+" },
              ].map((item) => (
                <li key={item.text} className="flex items-start gap-2">
                  <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
                  {item.text}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Plan comparison cards */}
      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-2xl font-bold">Compare plans</h2>
            <p className="text-sm text-muted-foreground">Free · Silver · Gold · Platinum</p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {MEMBERSHIP_PLANS.map((plan) => {
            const isCurrent = plan.id === sub?.planId
            const isSelected = plan.id === selectedCompare
            return (
              <article
                key={plan.id}
                className={cn(
                  "relative flex flex-col overflow-hidden rounded-3xl border bg-card shadow-sm transition-shadow",
                  plan.highlighted ? "border-secondary/50 ring-1 ring-secondary/30" : "border-border",
                  isSelected && "shadow-md"
                )}
              >
                {plan.badge && (
                  <div className="bg-peacock px-3 py-2 text-center text-[11px] font-semibold text-white">
                    {plan.badge}
                  </div>
                )}
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-serif text-xl font-bold">{plan.name}</h3>
                      <p className="mt-1 text-xs text-muted-foreground">{plan.tagline}</p>
                    </div>
                    {isCurrent && (
                      <Badge className="shrink-0 border-transparent bg-primary/10 text-primary">Current</Badge>
                    )}
                  </div>
                  <p className="mt-4 font-serif text-3xl font-bold text-primary">{plan.price}</p>
                  <p className="text-xs text-muted-foreground">/ {plan.period}</p>

                  <ul className="mt-4 space-y-2 text-sm">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto space-y-2 pt-5">
                    <button
                      type="button"
                      onClick={() => setSelectedCompare(plan.id)}
                      className={cn(
                        "w-full rounded-full border px-3 py-2 text-xs font-semibold transition-colors",
                        isSelected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:border-primary/40"
                      )}
                    >
                      Preview unlocks
                    </button>
                    {isCurrent ? (
                      <Button variant="outline" className="w-full" disabled={plan.id === "free"}>
                        Current plan
                      </Button>
                    ) : (
                      <Link href={`/checkout?plan=${plan.id}`} className="block">
                        <Button variant={plan.highlighted ? "secondary" : "default"} className="w-full">
                          Upgrade
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      </section>

      {/* Feature unlock preview */}
      {previewPlan && (
        <section className="rounded-3xl border border-border bg-card p-5 shadow-sm md:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] text-gold uppercase">Feature unlock preview</p>
              <h2 className="mt-1 font-serif text-2xl font-bold">
                You&apos;ll unlock with {previewPlan.name}
              </h2>
            </div>
            {previewPlan.id !== sub?.planId && (
              <Link href={`/checkout?plan=${previewPlan.id}`}>
                <Button size="lg">
                  Upgrade to {previewPlan.name} · {previewPlan.price}
                </Button>
              </Link>
            )}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            You&apos;ll unlock: {previewPlan.unlocks.join(" · ")}.
          </p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {previewPlan.unlocks.map((item) => (
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

      {/* Feature comparison table */}
      <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4 md:px-6">
          <h2 className="font-serif text-xl font-bold">Full feature comparison</h2>
          <p className="text-sm text-muted-foreground">Checkmarks show what each tier includes.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 font-semibold md:px-6">Feature</th>
                {MEMBERSHIP_PLANS.map((p) => (
                  <th key={p.id} className="px-3 py-3 text-center font-semibold">
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

      {/* Refer and earn */}
      <section className="grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-secondary/30 bg-[#fff9f2] p-5 md:p-6">
          <div className="flex items-center gap-2 text-primary">
            <Gift className="h-5 w-5" />
            <p className="text-xs font-semibold tracking-[0.18em] uppercase">Refer and earn</p>
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

        {/* Invoices */}
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
              <Link href="/checkout?plan=gold" className="mt-4 inline-block">
                <Button size="sm" variant="soft">
                  Upgrade to create one
                </Button>
              </Link>
            </div>
          ) : (
            <ul className="mt-4 space-y-2">
              {invoices.map((inv) => (
                <li
                  key={inv.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border px-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {inv.planName} · {inv.amount}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {inv.id} · {formatExpiry(inv.paidAt)} · {inv.method}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadInvoice(inv)}
                    aria-label={`Download ${inv.id}`}
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
          Prefer a relationship manager? Platinum includes assisted shortlisting. Brokers and family referrals also get lower subscription options.
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
    "Astalakshimi Matrimony — Tax Invoice (demo)",
    `Invoice: ${inv.id}`,
    `Plan: ${inv.planName}`,
    `Amount: ${inv.amount}`,
    `Method: ${inv.method}`,
    `Status: ${inv.status}`,
    `Paid at: ${new Date(inv.paidAt).toLocaleString("en-IN")}`,
    "",
    "This is a demo invoice generated in the browser.",
  ]
  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${inv.id}.txt`
  a.click()
  URL.revokeObjectURL(url)
}
