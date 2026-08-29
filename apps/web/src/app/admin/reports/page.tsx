"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useActionReportMutation, useAdminReportsQuery } from "@/hooks/admin-queries"
import { formatAdminDate, type ReportCategory } from "@/lib/admin-store"
import { cn } from "@/lib/utils"

const categoryLabels: Record<ReportCategory, string> = {
  inappropriate_photo: "Inappropriate photo",
  fake_id: "Fake ID",
  harassment: "Harassment",
  spam: "Spam",
}

export default function AdminReportsPage() {
  const { data: reports = [] } = useAdminReportsQuery()
  const actionReport = useActionReportMutation()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">Member flags and automated checks</p>
      </div>

      <div className="space-y-2">
        {reports.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
            No reports yet.
          </div>
        ) : (
          reports.map((report) => (
            <article key={report.id} className="rounded-xl border border-border bg-card p-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold">{report.profileName}</h2>
                <Badge variant="outline">{categoryLabels[report.category]}</Badge>
                <Badge
                  className={cn(
                    "border-transparent capitalize",
                    report.status === "new" ? "bg-amber-100 text-amber-900" : "bg-emerald-100 text-emerald-800"
                  )}
                >
                  {report.status}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-foreground/85">{report.description}</p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                {report.reportedBy} · {formatAdminDate(report.createdAt)}
              </p>
              {report.status === "new" && (
                <Button
                  size="sm"
                  className="mt-3 rounded-lg"
                  onClick={() => void actionReport.mutateAsync(report.id)}
                  disabled={actionReport.isPending}
                >
                  Mark actioned
                </Button>
              )}
            </article>
          ))
        )}
      </div>
    </div>
  )
}
