"use client"

import * as React from "react"
import { useProfileQuery } from "@/hooks/queries"
import { Button } from "@/components/ui/button"
import { Check, Copy, Gift, Share2, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"

export function getReferralCode(name?: string, phone?: string): string {
  const source = name || phone || "MEMBER"
  const clean = source
    .toString()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 8)
  return `ASTA-${clean || "MEMBER"}-2026`
}

export function getReferralLink(code: string): string {
  if (typeof window === "undefined") {
    return `https://astalakshimi-web.vercel.app/register?ref=${code}`
  }
  const origin = window.location.origin.includes("localhost")
    ? "https://astalakshimi-web.vercel.app"
    : window.location.origin
  return `${origin}/register?ref=${code}`
}

export function ReferAndEarnCard({ className }: { className?: string }) {
  const { data: profile } = useProfileQuery()
  const [copied, setCopied] = React.useState(false)

  const referralCode = React.useMemo(() => {
    return getReferralCode(profile?.fullName, profile?.phone)
  }, [profile?.fullName, profile?.phone])

  const referralLink = React.useMemo(() => {
    return getReferralLink(referralCode)
  }, [referralCode])

  const copyReferral = async () => {
    try {
      await navigator.clipboard.writeText(referralLink)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const shareReferral = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Astalakshimi Matrimony",
          text: `Join Astalakshimi Matrimony using my referral code ${referralCode} — you get started free and we both get 1 month Silver free!`,
          url: referralLink,
        })
        return
      } catch {
        // Fallback to copy
      }
    }
    await copyReferral()
  }

  return (
    <div
      className={cn(
        "rounded-2xl md:rounded-3xl border border-secondary/30 bg-[#fff9f2] p-5 md:p-6 shadow-sm",
        className
      )}
    >
      {/* Header: Gift icon + uppercase label */}
      <div className="flex items-center gap-2 text-primary">
        <Gift className="h-5 w-5 text-[#7c1535]" />
        <span className="text-xs font-bold uppercase tracking-wider text-[#7c1535]">
          Refer and earn
        </span>
      </div>

      {/* Main Title */}
      <h2 className="mt-2.5 font-serif text-xl md:text-2xl font-bold tracking-tight text-foreground">
        Refer a friend → get 1 month Silver free
      </h2>

      {/* Description */}
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        Share your unique link. When they complete signup with your code, you earn 1 month of
        Silver.
      </p>

      {/* Inset Code Box */}
      <div className="mt-4 rounded-xl md:rounded-2xl border border-secondary/20 bg-card p-3.5 sm:p-4 shadow-xs">
        <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Your referral code
        </p>
        <p className="mt-1 font-mono text-lg sm:text-xl font-bold tracking-wide text-primary">
          {referralCode}
        </p>
        <p className="mt-1.5 break-all text-xs text-muted-foreground/85">
          {referralLink}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <Button
          type="button"
          onClick={() => void shareReferral()}
          className="rounded-full bg-[#7c1535] px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#63102a] active:scale-95 transition"
        >
          <Share2 className="mr-2 h-4 w-4" />
          Share link
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => void copyReferral()}
          className="rounded-full border-border/80 bg-card px-5 py-2 text-sm font-semibold text-foreground hover:bg-muted/60 active:scale-95 transition"
        >
          {copied ? (
            <>
              <Check className="mr-2 h-4 w-4 text-emerald-600" />
              Copied
            </>
          ) : (
            <>
              <Copy className="mr-2 h-4 w-4 text-muted-foreground" />
              Copy link
            </>
          )}
        </Button>
      </div>

      {/* Perks summary */}
      <div className="mt-4 pt-3.5 border-t border-secondary/15 flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-secondary" />
          Both you and your friend receive benefits
        </span>
        <span className="font-medium text-foreground">Unlimited invites</span>
      </div>
    </div>
  )
}
