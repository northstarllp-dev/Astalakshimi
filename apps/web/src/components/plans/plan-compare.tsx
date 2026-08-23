"use client"

import * as React from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MEMBERSHIP_PLANS, type PlanId } from "@/lib/plans"
import { cn } from "@/lib/utils"
import { Check } from "lucide-react"

const TIER_ORDER: PlanId[] = ["free", "silver", "gold", "platinum", "diamond"]

type PlanCompareProps = {
  currentPlanId: PlanId
  selectedPlanId: PlanId
  onSelect: (planId: PlanId) => void
  onChoose: (planId: PlanId) => void
}

export function PlanCompare({ currentPlanId, selectedPlanId, onSelect, onChoose }: PlanCompareProps) {
  const scrollToPlan = (planId: PlanId) => {
    onSelect(planId)
    document.getElementById(`plan-${planId}`)?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    })
  }

  return (
    <section className="relative overflow-hidden rounded-[1.75rem] border border-secondary/25 bg-card shadow-sm">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: "radial-gradient(circle, #b8901f 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="gold-rule absolute inset-x-0 top-0" />
      <div className="gold-rule absolute inset-x-0 bottom-0 opacity-40" />

      <div className="relative px-4 pb-6 pt-8 sm:px-6 md:px-8 md:pb-8">
        <header className="mb-8 text-center">
          <p className="royal-label">Membership</p>
          <h2 className="mt-2 font-serif text-3xl font-bold text-foreground md:text-4xl">Compare plans</h2>
          <div className="ornament-line mx-auto mt-3 max-w-[12rem] text-xs">✦</div>
          <nav
            aria-label="Jump to a plan"
            className="mt-4 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-sm"
          >
            {MEMBERSHIP_PLANS.map((plan, index) => (
              <React.Fragment key={plan.id}>
                {index > 0 && <span className="text-gold/45" aria-hidden="true">·</span>}
                <button
                  type="button"
                  onClick={() => scrollToPlan(plan.id)}
                  className={cn(
                    "cursor-pointer rounded-full px-1.5 py-1 font-medium tracking-wide transition-colors",
                    selectedPlanId === plan.id
                      ? "text-primary"
                      : "text-gold hover:text-primary"
                  )}
                >
                  {plan.name}
                </button>
              </React.Fragment>
            ))}
          </nav>
        </header>

        <div className="-mx-4 overflow-x-auto px-4 pb-2 hide-scrollbar sm:-mx-2 sm:px-2">
          <div className="flex min-w-max items-stretch gap-3 lg:min-w-0 lg:grid lg:grid-cols-5 lg:items-end lg:gap-3">
            {MEMBERSHIP_PLANS.map((plan) => {
              const isCurrent = plan.id === currentPlanId
              const isSelected = plan.id === selectedPlanId
              const isGold = plan.id === "gold"
              const isPlatinum = plan.id === "platinum"
              const isDiamond = plan.id === "diamond"

              return (
                <article
                  key={plan.id}
                  id={`plan-${plan.id}`}
                  aria-current={isSelected ? "true" : undefined}
                  onClick={() => onSelect(plan.id)}
                  className={cn(
                    "relative flex w-[min(248px,82vw)] shrink-0 cursor-pointer flex-col overflow-hidden rounded-[1.35rem] border bg-card transition-all duration-300",
                    "lg:w-auto",
                    isGold
                      ? "z-10 border-secondary shadow-[0_12px_36px_rgba(184,144,31,0.22)] lg:-mt-5"
                      : "border-border hover:border-secondary/45",
                    isSelected && !isGold && "border-primary/35 shadow-[0_8px_24px_rgba(124,21,53,0.08)]"
                  )}
                >
                  {plan.badge && (
                    <div
                      className={cn(
                        "px-3 py-2 text-center text-[10px] font-bold tracking-[0.18em] uppercase",
                        isGold && "bg-gradient-to-r from-[#a07818] via-[#e8c84a] to-[#a07818] text-[#1a0e08]",
                        isPlatinum && "bg-peacock text-accent-foreground",
                        isDiamond && "bg-primary text-primary-foreground"
                      )}
                    >
                      {isGold ? `✦ ${plan.badge} ✦` : plan.badge}
                    </div>
                  )}

                  <div className={cn("flex flex-1 flex-col p-5", !plan.badge && "pt-7")}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3
                          className={cn(
                            "font-serif text-xl font-bold",
                            isGold ? "text-gold" : "text-foreground"
                          )}
                        >
                          {plan.name}
                        </h3>
                        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{plan.tagline}</p>
                      </div>
                      {isCurrent && (
                        <Badge className="shrink-0 border-transparent bg-muted text-muted-foreground">Current</Badge>
                      )}
                    </div>

                    <p className="mt-5 flex items-baseline gap-1.5">
                      <span
                        className={cn(
                          "font-serif text-[2.35rem] font-bold leading-none tracking-tight",
                          isGold ? "text-gold" : "text-foreground"
                        )}
                      >
                        {plan.price}
                      </span>
                      <span className="text-[11px] font-medium leading-tight text-muted-foreground">
                        / {plan.period}
                      </span>
                    </p>

                    <ul className="mt-6 mb-7 space-y-3 text-sm">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2.5 text-foreground/80">
                          {isGold ? (
                            <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-secondary">
                              <Check className="h-2.5 w-2.5 text-secondary-foreground" strokeWidth={3} />
                            </span>
                          ) : (
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-secondary" />
                          )}
                          <span className="text-[13px] leading-snug">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-auto">
                      {isCurrent ? (
                        <Button
                          variant="outline"
                          className="h-11 w-full"
                          disabled
                          onClick={(event) => event.stopPropagation()}
                        >
                          Current plan
                        </Button>
                      ) : (
                        <Button
                          variant={isGold ? "secondary" : "outline"}
                          className={cn(
                            "h-11 w-full",
                            isGold && "text-secondary-foreground hover:text-secondary-foreground"
                          )}
                          onClick={(event) => {
                            event.stopPropagation()
                            onChoose(plan.id)
                          }}
                        >
                          {TIER_ORDER.indexOf(plan.id) > TIER_ORDER.indexOf(currentPlanId)
                            ? `Upgrade to ${plan.name}`
                            : plan.id === "free"
                              ? "Start free"
                              : `Switch to ${plan.name}`}
                        </Button>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
