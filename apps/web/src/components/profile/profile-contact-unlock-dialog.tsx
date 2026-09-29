"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
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
import { CheckCircle2, Loader2, Lock, Phone } from "lucide-react"

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

function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "")
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`
  }
  return phone.startsWith("+") ? phone : `+${phone}`
}

export function ProfileContactUnlockDialog({
  open,
  onOpenChange,
  profileId,
  access,
  phone,
  onUnlocked,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  profileId: string
  access?: ContactAccessState | null
  /** Known phone when the contact was already unlocked (e.g. from /contacts/unlocked). */
  phone?: string | null
  onUnlocked?: (phone: string | null) => void
}) {
  const unlock = useUnlockContactMutation()
  const payExtra = usePayExtraContactUnlockMutation()
  const router = useRouter()
  const [error, setError] = React.useState("")
  const [revealedPhone, setRevealedPhone] = React.useState<string | null>(phone ?? null)
  const [justUnlocked, setJustUnlocked] = React.useState(false)

  const remaining = access?.remaining ?? null
  const limit = access?.limit ?? 3
  const unlimited = limit === null
  const isUnlocked = Boolean(access?.isUnlocked) || justUnlocked
  const canQuota = !isUnlocked && Boolean(access?.canUnlockWithQuota)
  const canPay = !isUnlocked && Boolean(access?.canPayExtra)
  const fee = (access?.extraContactFeePaise ?? EXTRA_CONTACT_FEE * 100) / 100
  const busy = unlock.isPending || payExtra.isPending

  const usedThisMonth = access?.usedThisMonth ?? 0
  const currentCredit = usedThisMonth + 1

  React.useEffect(() => {
    if (!open) {
      setError("")
      setRevealedPhone(phone ?? null)
      setJustUnlocked(false)
      return
    }
    setRevealedPhone(phone ?? null)
  }, [open, phone, profileId])

  // Already unlocked from Discover / Matches — fetch the real number if we don't have it yet.
  React.useEffect(() => {
    if (!open || !isUnlocked || revealedPhone || !profileId) return
    let cancelled = false
    void (async () => {
      try {
        const res = await unlock.mutateAsync(profileId)
        if (cancelled) return
        if (res.contactPhone) {
          setRevealedPhone(res.contactPhone)
          onUnlocked?.(res.contactPhone)
        }
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "Could not load this contact.")
      }
    })()
    return () => {
      cancelled = true
    }
    // Intentionally omit unlock/onUnlocked — only refetch when the dialog opens for an unlocked contact.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isUnlocked, revealedPhone, profileId])

  const handleQuotaUnlock = async () => {
    setError("")
    try {
      const res = await unlock.mutateAsync(profileId)
      const nextPhone = res.contactPhone ?? null
      setRevealedPhone(nextPhone)
      setJustUnlocked(true)
      onUnlocked?.(nextPhone)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not unlock this contact.")
    }
  }

  const handlePayExtra = () => {
    onOpenChange(false)
    router.push(`/checkout?plan=extra_contact&targetProfileId=${profileId}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            {isUnlocked ? <CheckCircle2 className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
          </div>
          <DialogTitle className="text-center font-serif text-xl">
            {isUnlocked ? "Contact unlocked" : "Contact locked"}
          </DialogTitle>
          <DialogDescription className="text-center text-sm leading-relaxed">
            {isUnlocked
              ? "You already unlocked this number. It is shared privately for matchmaking only."
              : "Mobile numbers stay hidden until you spend a contact unlock from your plan."}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 text-center">
          <Phone className="mx-auto mb-1.5 h-4 w-4 text-primary" />
          {isUnlocked && revealedPhone ? (
            <p className="font-mono text-base font-semibold tracking-wide text-foreground">
              {formatPhone(revealedPhone)}
            </p>
          ) : isUnlocked && busy ? (
            <p className="inline-flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading number…
            </p>
          ) : (
            <p className="font-mono text-sm font-semibold tracking-wide text-foreground">+91 ••••• •••••</p>
          )}
          {!isUnlocked && (
            <p className="mt-1.5 text-xs text-muted-foreground">
              {unlimited
                ? "Unlimited contact unlocks on your plan."
                : `${Math.max(0, remaining ?? 0)} of ${limit} contact unlocks left this month.`}
            </p>
          )}
        </div>

        {error && <p className="text-center text-xs text-destructive">{error}</p>}

        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          {isUnlocked ? (
            revealedPhone ? (
              <Button type="button" className="w-full" asChild>
                <a href={`tel:${revealedPhone.replace(/\D/g, "")}`}>Call now</a>
              </Button>
            ) : (
              <p className="text-center text-sm text-muted-foreground">This contact is already unlocked.</p>
            )
          ) : canQuota ? (
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
