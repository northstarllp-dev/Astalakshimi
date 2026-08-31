"use client"

import { Badge } from "@/components/ui/badge"
import { useAdminAuditQuery } from "@/hooks/admin-queries"
import { formatAdminDate } from "@/lib/admin-store"
import { cn } from "@/lib/utils"

export default function AdminAuditPage() {
  const { data: entries = [] } = useAdminAuditQuery()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight">Audit</h1>
        <p className="text-sm text-muted-foreground">Approvals, rejections, and creates</p>
      </div>

      <div className="space-y-2 md:hidden">
        {entries.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
            No audit entries yet.
          </p>
        ) : (
          entries.map((entry) => (
            <article key={entry.id} className="rounded-xl border border-border bg-card p-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">{entry.profileName}</p>
                <ActionBadge action={entry.action} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {entry.staffName} · {formatAdminDate(entry.createdAt)}
              </p>
              {entry.note && <p className="mt-2 text-sm text-foreground/80">{entry.note}</p>}
            </article>
          ))
        )}
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-2.5 font-medium">When</th>
              <th className="px-3 py-2.5 font-medium">Profile</th>
              <th className="px-3 py-2.5 font-medium">Action</th>
              <th className="px-3 py-2.5 font-medium">Staff</th>
              <th className="px-3 py-2.5 font-medium">Note</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b border-border/70 last:border-0">
                <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                  {formatAdminDate(entry.createdAt)}
                </td>
                <td className="px-3 py-2.5 font-medium">{entry.profileName}</td>
                <td className="px-3 py-2.5">
                  <ActionBadge action={entry.action} />
                </td>
                <td className="px-3 py-2.5">
                  <p>{entry.staffName}</p>
                  <p className="text-xs text-muted-foreground">{entry.staffEmail}</p>
                </td>
                <td className="px-3 py-2.5 text-muted-foreground">{entry.note ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ActionBadge({ action }: { action: "approved" | "rejected" | "suspended" | "created" }) {
  const styles = {
    approved: "bg-emerald-100 text-emerald-800",
    rejected: "bg-destructive/10 text-destructive",
    suspended: "bg-amber-100 text-amber-900",
    created: "bg-primary/10 text-primary",
  }
  return <Badge className={cn("border-transparent capitalize", styles[action])}>{action}</Badge>
}
