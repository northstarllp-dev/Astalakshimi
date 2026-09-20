"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import * as React from "react"
import Link from "next/link"
import { getPlanById, type PlanId } from "@/lib/plans"
import { ArrowLeft, CheckCircle2, Lock } from "lucide-react"
import { queryKeys } from "@/hooks/queries"
import { useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import { openRazorpayCheckout } from "@/lib/razorpay"

function CheckoutInner() {
  const router = useRouter()
  const params = useSearchParams()
  const planId = (params.get("plan") || "gold") as PlanId
  const isRenew = params.get("renew") === "1"
  const plan = getPlanById(planId)
  const queryClient = useQueryClient()
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
  const unlocks = plan.unlocks || []

  const finishCheckout = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.subscription })
    await queryClient.invalidateQueries({ queryKey: queryKeys.invoices })
    await queryClient.invalidateQueries({ queryKey: queryKeys.paid })
    await queryClient.invalidateQueries({ queryKey: queryKeys.contactUsage })
    setPaying(false)
    setDone(true)
    window.setTimeout(() => router.push("/plans"), 1400)
  }

  const confirm = async () => {
    setError("")
    setPaying(true)

    try {
      const order = await apiClient.payments.createOrder(plan.id)

      if (order.freeActivated) {
        await finishCheckout()
        return
      }

      if (!order.orderId || !order.keyId) {
        throw new Error("Could not start Razorpay checkout. Check RAZORPAY_KEY_ID on the API.")
      }

      const paid = await openRazorpayCheckout({
        keyId: order.keyId,
        orderId: order.orderId,
        amount: order.amount ?? plan.priceInPaise,
        currency: order.currency || "INR",
        name: "Ashtalakshmi",
        description: `${plan.name} plan`,
      })

      await apiClient.payments.verifyPayment(paid)
      await finishCheckout()
    } catch (err: any) {
      console.error("Payment error:", err)
      setError(err?.message || "Payment processing failed. Please try again.")
      setPaying(false)
    }
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
          <p className="text-xs text-muted-foreground">Secured by Razorpay</p>
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
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold tracking-[0.18em] text-gold uppercase">You&apos;ll unlock</p>
            <ul className="mt-4 space-y-2">
              {unlocks.map((item: string) => (
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
                {plan.name} is active. Returning to plans…
              </p>
            </div>
          ) : (
            <>
              <h3 className="font-semibold">Pay with Razorpay</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                UPI, cards, netbanking, and wallets open in the Razorpay checkout.
              </p>

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
                Payments are processed by Razorpay. You will be redirected back after a successful payment.
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
    <React.Suspense fallback={<main className="p-8 text-center text-sm text-muted-foreground">Loading checkout…</main>}>
      <CheckoutInner />
    </React.Suspense>
  )
}
