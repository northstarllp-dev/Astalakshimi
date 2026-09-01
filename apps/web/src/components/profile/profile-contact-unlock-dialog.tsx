"use client"

import * as React from "react"
import Link from "next/link"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { EXTRA_CONTACT_FEE } from "@/lib/plans"
import { useUnlockContactMutation, usePayExtraContactUnlockMutation } from "@/hooks/queries"
import { Loader2, Lock, Phone } from "lucide-react"

export type ContactAccessState = {
  canView: boolean
  isUnlocked: boolean
  isMutualBenefit: boolean
  limit: number | null
  usedThisMonth: number
  remaining: number | null
  canUnlockWithQuota: boolean
  canPayExtra: boolean
  extraContactFeePaise: number
  planSlug: string
}

export function ProfileContactUnlockDialog({
  open,
  onOpenChange,
  profileId,
  access,
  onUnlocked,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  profileId: string
  access?: ContactAccessState | null
  onUnlocked?: (phone: string | null) => void
}) {
  const unlock = useUnlockContactMutation()
  const payExtra = usePayExtraContactUnlockMutation()
  const [error, setError] = React.useState("")

  const remaining = access?.remaining ?? null
  const limit = access?.limit ?? 3
  const unlimited = limit === null
  const canQuota = Boolean(access?.canUnlockWithQuota || unlimited)
  const canPay = Boolean(access?.canPayExtra)
  const fee = (access?.extraContactFeePaise ?? EXTRA_CONTACT_FEE * 100) / 100
  const busy = unlock.isPending || payExtra.isPending

  const usedThisMonth = access?.usedThisMonth ?? 0
  const currentCredit = usedThisMonth + 1

  const handleQuotaUnlock = async () => {
    setError("")
    try {
      const res = await unlock.mutateAsync(profileId)
      onUnlocked?.(res.contactPhone ?? null)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not unlock this contact.")
    }
  }

  const handlePayExtra = async () => {
    setError("")
    try {
      const res = await payExtra.mutateAsync(profileId)
      onUnlocked?.(res.contactPhone ?? null)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed. Please try again.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Lock className="h-5 w-5" />
          </div>
          <DialogTitle className="text-center font-serif text-xl">Contact locked</DialogTitle>
          <DialogDescription className="text-center text-sm leading-relaxed">
            Mobile numbers stay hidden until you spend a contact unlock from your plan.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 text-center">
          <Phone className="mx-auto mb-1.5 h-4 w-4 text-primary" />
          <p className="font-mono text-sm font-semibold tracking-wide text-foreground">+91 ••••• •••••</p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {unlimited
              ? "Unlimited contact unlocks on your plan."
              : `${Math.max(0, remaining ?? 0)} of ${limit} contact unlocks left this month.`}
          </p>
        </div>

        {error && <p className="text-center text-xs text-destructive">{error}</p>}

        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          {canQuota ? (
            <Button type="button" className="w-full" disabled={busy} onClick={() => void handleQuotaUnlock()}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {unlimited ? "Unlock contact" : `Use ${currentCredit}/${limit} credit to unlock contact`}
            </Button>
          ) : canPay ? (
            <>
              <p className="text-center text-xs text-muted-foreground">
                Monthly limit reached. Pay ₹{fee} for this extra contact, or upgrade your plan.
              </p>
              <Button type="button" className="w-full" disabled={busy} onClick={() => void handlePayExtra()}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Pay ₹{fee} to unlock
              </Button>
              <Button type="button" variant="outline" className="w-full" asChild>
                <Link href="/plans">View plans</Link>
              </Button>
            </>
          ) : (
            <Button type="button" className="w-full" asChild>
              <Link href="/plans">View plans</Link>
            </Button>
          )}
          <Button type="button" variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
            Not now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
