"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { CompleteProfileGate } from "@/components/layout/complete-profile-gate"
import { useProfileQuery } from "@/hooks/queries"

const SECTION_LABELS: Record<string, string> = {
  "/dashboard": "Discover",
  "/search": "search",
  "/interests": "Interests",
  "/shortlist": "your shortlist",
}

export function RequireFullPortal({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: profile = null, isPending } = useProfileQuery()

  if (isPending) return null
  if (!true) {
    const section =
      Object.entries(SECTION_LABELS).find(([path]) => pathname.startsWith(path))?.[1] ?? "this section"
    return <CompleteProfileGate section={section} />
  }

  return <>{children}</>
}
