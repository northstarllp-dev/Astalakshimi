"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Step4Verify } from "@/components/signup/step-verify"
import { useProfileQuery, useResubmitVerificationMutation } from "@/hooks/queries"
import { emptySignupData, type SignupData } from "@/lib/profile-store"
import { AlertCircle, ArrowLeft, CheckCircle2, Clock3 } from "lucide-react"

export default function ProfileVerifyPage() {
  const router = useRouter()
  const { data: profile = null, isPending } = useProfileQuery()
  const resubmit = useResubmitVerificationMutation()
  const [draft, setDraft] = React.useState<SignupData | null>(null)

  React.useEffect(() => {
    if (profile) setDraft({ ...profile })
  }, [profile])

  if (isPending || !draft) {
    return <main className="px-4 py-10 text-center text-sm text-muted-foreground">Loading…</main>
  }

  if (!profile) {
    return (
      <main className="mx-auto max-w-xl px-4 py-10 text-center">
        <h1 className="font-serif text-2xl font-semibold">Create a profile first</h1>
        <p className="mt-2 text-sm text-muted-foreground">Verification needs an Astalakshimi profile.</p>
        <Link href="/register" className="mt-6 inline-block">
          <Button>Create profile</Button>
        </Link>
      </main>
    )
  }

  const status = profile.verificationStatus

  if (status === "verified") {
    return (
      <main className="mx-auto max-w-xl space-y-6 px-4 py-8">
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-3 font-serif text-2xl font-semibold">You&apos;re already verified</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your photos and ID passed review.</p>
          <Link href="/home" className="mt-6 inline-block">
            <Button className="rounded-md">Back to Home</Button>
          </Link>
        </div>
      </main>
    )
  }

  if (status === "pending") {
    return (
      <main className="mx-auto max-w-xl space-y-6 px-4 py-8">
        <div className="rounded-xl border border-[#e8d4a8] bg-[#fff8ef] p-6 text-center">
          <Clock3 className="mx-auto h-10 w-10 text-[#8a6a12]" />
          <h1 className="mt-3 font-serif text-2xl font-semibold">Verification under review</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            We already have your documents. You&apos;ll see an update on Home once staff finish the review.
          </p>
          <Link href="/home" className="mt-6 inline-block">
            <Button className="rounded-md">Back to Home</Button>
          </Link>
        </div>
      </main>
    )
  }

  const rejected = status === "rejected"

  return (
    <main className="mx-auto max-w-xl space-y-4 px-4 py-6 md:py-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="tap-target inline-flex items-center justify-center rounded-full border border-border"
          aria-label="Go back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="font-serif text-xl font-semibold">
            {rejected ? "Re-upload verification" : "Get verified"}
          </h1>
          <p className="text-sm text-muted-foreground">Selfie or government ID · reviewed in 12 hours</p>
        </div>
      </div>

      {rejected ? (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
          <div>
            <p className="text-sm font-semibold text-destructive">Previous submission was rejected</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {profile.rejectionReason || "Your verification documents could not be approved."}
            </p>
          </div>
        </div>
      ) : null}

      <Step4Verify
        data={draft}
        updateData={(fields) => setDraft((prev) => (prev ? { ...prev, ...fields } : prev))}
        isSubmitting={resubmit.isPending}
        onSubmit={() => {
          void resubmit.mutateAsync(draft).then(() => {
            router.push("/home")
          })
        }}
      />
    </main>
  )
}
