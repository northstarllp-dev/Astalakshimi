"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  getPlanById,
  loadCurrentPlanId,
  MEMBERSHIP_PLANS,
} from "@/lib/plans"
import { CheckCircle2, Sparkles } from "lucide-react"

export default function PlansPage() {
  const [currentId, setCurrentId] = React.useState("free")

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentId(loadCurrentPlanId())
  }, [])

  const current = getPlanById(currentId)

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-3 py-5 sm:px-4 md:py-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">Membership</p>
          <h1 className="mt-1 font-serif text-3xl font-bold">Plans for your family</h1>
          <p className="mt-1 max-w-lg text-sm text-muted-foreground">
            Lower than typical big-portal packages. Free for 3 months starting 14 September 2026.
          </p>
        </div>
        {current && (
          <Badge className="w-fit border-transparent bg-primary/10 text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Current: {current.name}
          </Badge>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {MEMBERSHIP_PLANS.map((plan) => {
          const isCurrent = plan.id === currentId
          return (
            <article
              key={plan.id}
              className={`flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm ${
                isCurrent ? "border-secondary/60 ring-1 ring-secondary/30" : "border-border"
              }`}
            >
              {plan.badge ? (
                <div className="bg-peacock px-3 py-2.5 text-center text-[11px] font-semibold leading-snug text-white">
                  {plan.badge}
                </div>
              ) : (
                <div className="border-b border-border px-4 pb-1 pt-5">
                  <h3 className="text-sm font-bold text-foreground">{plan.name}</h3>
                  <p className="mt-2 font-serif text-3xl font-bold text-primary">{plan.price}</p>
                </div>
              )}

              <div className="flex flex-1 flex-col px-4 py-4">
                {plan.badge ? (
                  <>
                    <h3 className="text-sm font-bold text-foreground">{plan.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{plan.period}</p>
                    <p className="mt-2 font-serif text-3xl font-bold text-primary">{plan.price}</p>
                  </>
                ) : (
                  <p className="text-xs font-medium text-muted-foreground">{plan.period}</p>
                )}

                <ul className="mt-4 space-y-1.5 text-xs text-foreground/80">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-1.5">
                      <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-secondary" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link href={`/checkout?plan=${plan.id}`} className="mt-auto pt-5">
                  <Button
                    variant={isCurrent ? "outline" : "secondary"}
                    className="w-full rounded-lg text-sm font-semibold"
                    disabled={isCurrent && plan.id === "free"}
                  >
                    {isCurrent ? "Current plan" : "Choose Plan"}
                  </Button>
                </Link>
              </div>
            </article>
          )
        })}
      </div>

      <section className="rounded-2xl border border-secondary/25 bg-[#fff9f2] p-5 md:p-6">
        <h2 className="font-serif text-xl font-bold">Assisted Service</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Brokers, referrals, and lower subscription cost — learn more on our public page.
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
