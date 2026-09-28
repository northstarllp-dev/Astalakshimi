"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useContactUsageQuery } from "@/hooks/queries"
import { contactQuotaHint, isContactQuotaExhausted } from "@/lib/contact-quota"

export function ContactQuotaBanner() {
  const { data: usage } = useContactUsageQuery()
  if (!isContactQuotaExhausted(usage)) return null
  const hint = contactQuotaHint(usage)
  if (!hint) return null

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
