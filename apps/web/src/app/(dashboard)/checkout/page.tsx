"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { getPlanById, saveCurrentPlanId } from "@/lib/plans"
import { ArrowLeft, CheckCircle2 } from "lucide-react"

function CheckoutInner() {
  const router = useRouter()
  const params = useSearchParams()
  const planId = params.get("plan") || "3m"
  const plan = getPlanById(planId)
  const [done, setDone] = React.useState(false)

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

  const confirm = () => {
    saveCurrentPlanId(plan.id)
    setDone(true)
    setTimeout(() => router.push("/plans"), 1200)
  }

  return (
    <main className="mx-auto max-w-lg space-y-5 px-3 py-5 sm:px-4 md:py-8">
      <div className="flex items-center gap-3">
        <Link
          href="/plans"
          className="tap-target inline-flex items-center justify-center rounded-full border border-border bg-card"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="font-serif text-2xl font-bold">Checkout</h1>
      </div>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">Selected plan</p>
        <h2 className="mt-2 font-serif text-3xl font-bold">{plan.name}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{plan.period}</p>
        <p className="mt-4 font-serif text-4xl font-bold text-primary">{plan.price}</p>
        <ul className="mt-5 space-y-2 text-sm">
          {plan.features.map((f) => (
            <li key={f} className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-secondary" /> {f}
            </li>
          ))}
        </ul>
      </section>

      {done ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-5 text-center text-emerald-900">
          <CheckCircle2 className="mx-auto h-8 w-8" />
          <p className="mt-2 font-semibold">Plan activated (demo)</p>
          <p className="text-sm">Returning to membership…</p>
        </div>
      ) : (
        <div className="space-y-3">
          <Button className="w-full" onClick={confirm}>
            Pay later (demo)
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Razorpay / PhonePe will plug in later. This only saves your selection on this device.
          </p>
        </div>
      )}
    </main>
  )
}

export default function CheckoutPage() {
  return (
    <React.Suspense fallback={<main className="px-4 py-10 text-center text-sm text-muted-foreground">Loading…</main>}>
      <CheckoutInner />
    </React.Suspense>
  )
}
