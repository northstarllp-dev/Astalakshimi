"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useInterestUsageQuery } from "@/hooks/queries"
import { interestQuotaHint, isInterestQuotaExhausted } from "@/lib/interest-quota"

export function InterestQuotaBanner() {
  const { data: usage } = useInterestUsageQuery()
  if (!isInterestQuotaExhausted(usage)) return null
  const hint = interestQuotaHint(usage)

  return (
    <div className="mb-4 flex flex-col gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4">
      <p className="text-sm text-amber-950">{hint}</p>
      <Link href="/plans" className="shrink-0">
        <Button size="sm" className="h-8 rounded-md">
          Upgrade plan
        </Button>
      </Link>
    </div>
  )
}
