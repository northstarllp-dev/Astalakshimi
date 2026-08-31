"use client"

import { AdminGate } from "@/components/admin/admin-gate"
import { AdminShell } from "@/components/admin/admin-shell"
import { usePathname } from "next/navigation"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLogin = pathname === "/admin/login"

  return (
    <AdminGate>
      {isLogin ? children : <AdminShell>{children}</AdminShell>}
    </AdminGate>
  )
}
