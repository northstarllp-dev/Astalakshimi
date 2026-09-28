"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { HomeEntrance } from "@/components/dashboard/home-entrance"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { apiClient } from "@/lib/api-client"

/**
 * Defense-in-depth: if someone reaches a dashboard route without a profile
 * (stale cookie / race), bounce them back to onboarding.
 */
export default function DashboardGroupLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const me = await apiClient.auth.getMe()
        if (cancelled) return
        if (!me.hasProfile) {
          try {
            await apiClient.auth.syncEnrollment()
          } catch {
            /* best-effort */
          }
          router.replace("/register")
          return
        }
        try {
          await apiClient.auth.syncEnrollment()
        } catch {
          /* Enrollment cookie sync is best-effort; don't block the shell. */
        }
        if (!cancelled) setReady(true)
      } catch {
        if (!cancelled) router.replace("/login")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [router])

  if (!ready) {
    const openingHome = pathname === "/home"
    return (
      <HomeEntrance
        title={openingHome ? "Opening your home" : "One moment"}
        detail={openingHome ? "Gathering your matches" : "Loading your account"}
      />
    )
  }

  return <DashboardShell>{children}</DashboardShell>
}
