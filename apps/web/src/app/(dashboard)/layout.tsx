"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { apiClient } from "@/lib/api-client"

/**
 * Defense-in-depth: if someone reaches a dashboard route without a profile
 * (stale cookie / race), bounce them back to onboarding.
 */
export default function DashboardGroupLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
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
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background text-sm text-muted-foreground">
        Checking your profile…
      </div>
    )
  }

  return <DashboardShell>{children}</DashboardShell>
}
