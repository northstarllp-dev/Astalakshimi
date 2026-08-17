"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  activatePlan,
  addInvoice,
  getPlanById,
  getUnlockPreview,
  type PlanId,
} from "@/lib/plans"
import {
  ArrowLeft,
  CheckCircle2,
  CreditCard,
  Landmark,
  Lock,
  Smartphone,
  Wallet,
} from "lucide-react"
import { checkoutSchema } from "@/lib/validation"
import { queryKeys } from "@/hooks/queries"
import { useQueryClient } from "@tanstack/react-query"
import { cn } from "@/lib/utils"

type PayMethod = "upi" | "card" | "netbanking" | "wallet"

const PAY_METHODS: { id: PayMethod; label: string; hint: string; icon: typeof Smartphone }[] = [
  { id: "upi", label: "UPI", hint: "GPay, PhonePe, Paytm", icon: Smartphone },
  { id: "card", label: "Card", hint: "Visa, Mastercard, RuPay", icon: CreditCard },
  { id: "netbanking", label: "Netbanking", hint: "All major banks", icon: Landmark },
  { id: "wallet", label: "Wallets", hint: "Paytm, Amazon Pay", icon: Wallet },
]

function CheckoutInner() {
  const router = useRouter()
  const params = useSearchParams()
  const planId = (params.get("plan") || "gold") as PlanId
  const isRenew = params.get("renew") === "1"
  const plan = getPlanById(planId)
  const queryClient = useQueryClient()
  const [method, setMethod] = React.useState<PayMethod>("upi")
  const [upiId, setUpiId] = React.useState("")
  const [paying, setPaying] = React.useState(false)
  const [done, setDone] = React.useState(false)
  const [error, setError] = React.useState("")

  if (!plan) {
    return (
      <main className="mx-auto max-w-lg px-4 py-10 text-center">
        <p className="font-semibold">Plan not found</p>
        <Link href="/plans">
          <Button className="mt-4">Back to plans</Button>
        </Link>
      </main>
    )
  }

  const priced =
    plan.priceInPaise === 0
      ? { label: "₹0", paise: 0 }
      : { label: plan.price, paise: plan.priceInPaise }
  const unlocks = getUnlockPreview(plan.id)
  const durationDays = plan.durationDays

  const confirm = () => {
    const parsed = checkoutSchema.safeParse({
      method,
      upiId,
      paidPlan: plan.priceInPaise > 0,
    })
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the payment details.")
      return
    }
    setError("")
    setPaying(true)
    window.setTimeout(() => {
      activatePlan(plan.id, durationDays)
      void queryClient.invalidateQueries({ queryKey: queryKeys.paid })
      if (plan.priceInPaise > 0) {
        addInvoice({
          planId: plan.id,
          planName: `${plan.name} (${plan.period})`,
          amount: priced.label,
          method: PAY_METHODS.find((m) => m.id === method)?.label ?? method,
          status: "paid",
        })
      }
      setPaying(false)
      setDone(true)
      window.setTimeout(() => router.push("/plans"), 1400)
    }, 900)
  }

  return (
    <main className="mx-auto max-w-3xl space-y-5 px-3 py-5 sm:px-4 md:py-8">
      <div className="flex items-center gap-3">
        <Link
          href="/plans"
          className="tap-target inline-flex items-center justify-center rounded-full border border-border bg-card"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="font-serif text-2xl font-bold">{isRenew ? "Renew plan" : "Upgrade checkout"}</h1>
          <p className="text-xs text-muted-foreground">Secured by Razorpay (demo flow)</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">Selected plan</p>
            <h2 className="mt-2 font-serif text-3xl font-bold">{plan.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>
            <p className="mt-4 font-serif text-4xl font-bold text-primary">{priced.label}</p>
            <p className="text-xs text-muted-foreground">/ {plan.period}</p>

            {plan.priceInPaise > 0 && (
              <p className="mt-4 text-xs text-muted-foreground">
                Extra contacts are ₹29 each after your included unlocks.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold tracking-[0.18em] text-gold uppercase">You&apos;ll unlock</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {unlocks.join(" · ")}.
            </p>
            <ul className="mt-4 space-y-2">
              {unlocks.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Lock className="h-3.5 w-3.5" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          {done ? (
            <div className="py-8 text-center text-emerald-900">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
              <p className="mt-3 font-serif text-2xl font-bold">Payment successful</p>
              <p className="mt-1 text-sm text-emerald-800/80">
                {plan.name} is active. Invoice saved. Returning to plans…
              </p>
            </div>
          ) : (
            <>
              <h3 className="font-semibold">Pay with Razorpay</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                UPI, cards, netbanking, and wallets — demo checkout only.
              </p>

              <div className="mt-4 grid grid-cols-2 gap-2">
                {PAY_METHODS.map((m) => {
                  const Icon = m.icon
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMethod(m.id)}
                      className={cn(
                        "rounded-2xl border px-3 py-3 text-left transition-colors",
                        method === m.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40"
                      )}
                    >
                      <Icon className="h-4 w-4 text-primary" />
                      <p className="mt-2 text-sm font-semibold">{m.label}</p>
                      <p className="text-[11px] text-muted-foreground">{m.hint}</p>
                    </button>
                  )
                })}
              </div>

              {method === "upi" && plan.priceInPaise > 0 && (
                <div className="mt-4 space-y-1.5">
                  <label htmlFor="upi" className="text-xs font-semibold">
                    UPI ID
                  </label>
                  <input
                    id="upi"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="name@oksbi"
                    className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              )}

              {method === "card" && (
                <div className="mt-4 space-y-2 rounded-xl border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                  Card fields appear in the live Razorpay modal. This demo skips collecting card data.
                </div>
              )}

              {error && (
                <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
                  {error}
                </p>
              )}

              <Button className="mt-5 w-full" size="lg" disabled={paying} onClick={confirm}>
                {paying
                  ? "Processing…"
                  : plan.priceInPaise === 0
                    ? "Activate free plan"
                    : `Pay ${priced.label}`}
              </Button>
              <p className="mt-3 text-center text-[11px] text-muted-foreground">
                One-tap upgrade. Live Razorpay keys plug in later — this saves plan + invoice on this device.
              </p>
            </>
          )}
        </section>
      </div>
    </main>
  )
}

export default function CheckoutPage() {
  return (
    <React.Suspense
      fallback={<main className="px-4 py-10 text-center text-sm text-muted-foreground">Loading checkout…</main>}
    >
      <CheckoutInner />
    </React.Suspense>
  )
}
