"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { useAdminSessionQuery } from "@/hooks/admin-queries"
import { Loader2 } from "lucide-react"

export function AdminGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, isLoading } = useAdminSessionQuery()
  const isLogin = pathname === "/admin/login"

  React.useEffect(() => {
    if (isLoading) return
    if (!session && !isLogin) {
      router.replace("/admin/login")
    }
    if (session && isLogin) {
      router.replace("/admin")
    }
  }, [session, isLoading, isLogin, router])

  // Staff login must render even while the mock session query is pending.
  if (isLogin) {
    if (session) return null
    return <>{children}</>
  }

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Loading" />
      </div>
    )
  }

  if (!session) return null

  return <>{children}</>
}
