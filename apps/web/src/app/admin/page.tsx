"use client"

import Link from "next/link"
import { StatCard } from "@/components/admin/stat-card"
import { Button } from "@/components/ui/button"
import { useAdminSessionQuery, useAdminStatsQuery, usePendingVerificationsQuery } from "@/hooks/admin-queries"
import { formatRelativeHours } from "@/lib/admin-store"
import { ChevronRight } from "lucide-react"

export default function AdminHomePage() {
  const { data: session } = useAdminSessionQuery()
  const { data: stats } = useAdminStatsQuery()
  const { data: pending = [] } = usePendingVerificationsQuery()
  const overdue = pending.filter((p) => p.slaBreached)

  const revenue = stats ? `₹${stats.totalRevenue.toLocaleString("en-IN")}` : ""

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">
            {session?.name?.split(" ")[0] ?? "Staff"}
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Today&apos;s queue and numbers</p>
        </div>
        <Link href="/admin/profiles?tab=review">
          <Button size="sm" className="rounded-lg">
            Review queue
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <StatCard label="Users" value={stats?.totalUsers ?? ""} />
        <StatCard label="Profiles" value={stats?.totalProfiles ?? ""} />
        <StatCard label="Paid" value={stats?.activeSubscriptions ?? ""} />
        <StatCard
          label="Pending"
          value={stats?.pendingVerifications ?? ""}
          tone={stats && stats.pendingVerifications > 0 ? "warn" : "default"}
        />
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <StatCard label="Revenue" value={revenue} hint="Demo total" />
        <StatCard label="Verified (7d)" value={stats?.verifiedThisWeek ?? ""} tone="ok" />
        <StatCard label="Rejected" value={stats?.rejectedCount ?? ""} tone="bad" />
        <StatCard label="Incomplete" value={stats?.incompleteCount ?? ""} hint="< 80%" />
      </div>

      <section className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Pending by type</h2>
          {stats && stats.slaBreachCount > 0 && (
            <span className="text-[11px] font-medium text-destructive">
              {stats.slaBreachCount} over 12h
            </span>
          )}
        </div>
        <ul className="divide-y divide-border">
          {[
            { label: "Photos", count: stats?.pendingByType.photos ?? 0 },
            { label: "Govt ID / selfie", count: stats?.pendingByType.govtId ?? 0 },
            { label: "Horoscope", count: stats?.pendingByType.horoscope ?? 0 },
          ].map((row) => (
            <li key={row.label} className="flex items-center justify-between px-4 py-3 text-sm">
              <span className="text-muted-foreground">{row.label}</span>
              <span className="font-semibold tabular-nums">{row.count}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">SLA watch</h2>
          <p className="text-[11px] text-muted-foreground">Pending longer than 12 hours</p>
        </div>
        {overdue.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">Nothing overdue</p>
        ) : (
          <ul className="divide-y divide-border">
            {overdue.slice(0, 5).map((p) => (
              <li key={p.id}>
                <Link
                  href={`/admin/profiles/${p.profileId}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.fullName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {p.city} · {formatRelativeHours(p.submittedAt)}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
