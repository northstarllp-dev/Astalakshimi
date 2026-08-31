"use client"

import Link from "next/link"
import { useProfileQuery } from "@/hooks/queries"
import { ChevronRight, Lock } from "lucide-react"
import {
  getProfileActions,
  getProfileCompletenessStats,
  getRequiredFieldEditHash,
  isProfileComplete,
} from "@/lib/portal-access"
import { CompletenessRing } from "@/components/profile/completeness-ring"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export function CompleteProfileGate({
  section = "this section",
}: {
  section?: string
}) {
  const { data: profile = null } = useProfileQuery()
  const completenessStats = getProfileCompletenessStats(profile)
  const completeness = completenessStats.percentage
  const rejected = profile?.verificationStatus === "rejected"
  const complete = isProfileComplete(profile)
  const nextActions = getProfileActions(profile).filter((a) => !a.done).slice(0, 4)
  const missingRequired = completenessStats.missingRequired.slice(0, 6)
  const editHref = completenessStats.missingRequired.some((f) => f.group === "career")
    ? "/profile/edit#career"
    : "/profile/edit"

  const reason = rejected
    ? `Verification was rejected. Re-upload your selfie or ID, then finish your profile to open ${section}.`
    : !complete
      ? `Fill every required detail to open ${section}. Specialization and employer are optional.`
      : `Verification is still pending — ${section} opens after approval.`

  return (
    <main className="mx-auto flex max-w-lg flex-col items-center px-4 py-12 text-center sm:py-16">
      <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Lock className="h-5 w-5" />
      </span>
      <h1 className="mt-4 font-serif text-2xl font-bold">Complete your profile</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">{reason}</p>

      <div className="mt-6">
        <CompletenessRing percentage={completeness} size={96} strokeWidth={8} />
      </div>
      <p className="mt-3 text-sm font-semibold text-foreground">{completeness}% complete</p>
      <p className="mt-1 text-xs text-muted-foreground">
        {completenessStats.requiredFilled} of {completenessStats.requiredTotal} required details filled
      </p>

      {missingRequired.length > 0 && (
        <ul className="mt-4 flex flex-wrap justify-center gap-2">
          {missingRequired.map((field) => (
            <Link key={field.id} href={`/profile/edit${getRequiredFieldEditHash(field)}`}>
              <Badge variant="outline" className="h-7 border-destructive/40 bg-destructive/5 font-semibold text-destructive">
                {field.label}
              </Badge>
            </Link>
          ))}
        </ul>
      )}

      {nextActions.length > 0 && missingRequired.length === 0 && (
        <ul className="mt-5 flex flex-wrap justify-center gap-2">
          {nextActions.map((action) => (
            <Link key={action.id} href={action.href}>
              <Badge variant="outline" className="h-7 font-semibold">
                {action.label}
              </Badge>
            </Link>
          ))}
        </ul>
      )}

      <Link href={rejected ? "/profile/verify" : editHref} className="mt-6">
        <Button>
          {rejected ? "Re-upload verification" : "Complete profile"}{" "}
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </Link>
      <Link href="/home" className="mt-3 text-sm font-semibold text-primary hover:underline">
        Back to Home
      </Link>
    </main>
  )
}
