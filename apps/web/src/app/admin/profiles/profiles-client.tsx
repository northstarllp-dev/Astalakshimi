"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  useAdminProfilesQuery,
  usePendingVerificationsQuery,
  useDeleteProfileMutation,
  useAdminSessionQuery,
} from "@/hooks/admin-queries"
import { formatRelativeHours, type AdminProfile } from "@/lib/admin-store"
import { cn } from "@/lib/utils"
import { AlertTriangle, Clock3, FileText, Plus, Search, UserRound } from "lucide-react"

type Tab = "review" | "all"

export default function AdminProfilesPageInner() {
  const searchParams = useSearchParams()
  const initialTab = searchParams.get("tab") === "all" ? "all" : "review"
  const [tab, setTab] = React.useState<Tab>(initialTab)
  const [query, setQuery] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [genderFilter, setGenderFilter] = React.useState("all")
  const [cityFilter, setCityFilter] = React.useState("all")
  const [completenessFilter, setCompletenessFilter] = React.useState("all")
  const [createdByFilter, setCreatedByFilter] = React.useState("all")
  const [filtersOpen, setFiltersOpen] = React.useState(false)

  const { data: profiles = [] } = useAdminProfilesQuery()
  const { data: pending = [] } = usePendingVerificationsQuery()
  const { data: session } = useAdminSessionQuery()
  const deleteMutation = useDeleteProfileMutation()

  const cities = React.useMemo(
    () => Array.from(new Set(profiles.map((p) => p.city))).sort(),
    [profiles]
  )

  const filteredAll = profiles.filter((p) => {
    const q = query.trim().toLowerCase()
    const matchesQuery =
      !q ||
      p.fullName.toLowerCase().includes(q) ||
      p.phone.includes(q) ||
      p.city.toLowerCase().includes(q)
    const matchesStatus = statusFilter === "all" || p.verificationStatus === statusFilter
    const matchesGender = genderFilter === "all" || p.gender === genderFilter
    const matchesCity = cityFilter === "all" || p.city === cityFilter
    const matchesCreatedBy = createdByFilter === "all" || p.createdBy === createdByFilter
    const matchesCompleteness =
      completenessFilter === "all" ||
      (completenessFilter === "low" && p.completeness < 80) ||
      (completenessFilter === "high" && p.completeness >= 80)
    return matchesQuery && matchesStatus && matchesGender && matchesCity && matchesCreatedBy && matchesCompleteness
  })

  const filteredPending = pending.filter((p) => {
    const q = query.trim().toLowerCase()
    return (
      !q ||
      p.fullName.toLowerCase().includes(q) ||
      p.phone.includes(q) ||
      p.city.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight">Profiles</h1>
          <p className="text-sm text-muted-foreground">Review queue and member list</p>
        </div>
        <Link href="/admin/profiles/new">
          <Button size="sm" className="rounded-lg">
            <Plus className="mr-1.5 h-4 w-4" /> Create
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-muted/40 p-1">
        {(["review", "all"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={cn(
              "cursor-pointer rounded-md py-2 text-sm font-medium transition-colors",
              tab === key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            )}
          >
            {key === "review" ? `Review (${pending.length})` : `All (${profiles.length})`}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, phone, city"
            className="h-11 rounded-lg pl-10"
          />
        </div>
        {tab === "all" && (
          <>
            <button
              type="button"
              className="cursor-pointer text-xs font-semibold text-primary"
              onClick={() => setFiltersOpen((v) => !v)}
            >
              {filtersOpen ? "Hide filters" : "Show filters"}
            </button>
            {filtersOpen && (
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                <FilterSelect label="Verification" value={statusFilter} onChange={setStatusFilter} options={[
                  { value: "all", label: "All statuses" },
                  { value: "pending", label: "Pending" },
                  { value: "verified", label: "Verified" },
                  { value: "rejected", label: "Rejected" },
                  { value: "idle", label: "Idle" },
                ]} />
                <FilterSelect label="Gender" value={genderFilter} onChange={setGenderFilter} options={[
                  { value: "all", label: "All" },
                  { value: "Female", label: "Female" },
                  { value: "Male", label: "Male" },
                ]} />
                <FilterSelect label="City" value={cityFilter} onChange={setCityFilter} options={[
                  { value: "all", label: "All cities" },
                  ...cities.map((c) => ({ value: c, label: c })),
                ]} />
                <FilterSelect label="Completeness" value={completenessFilter} onChange={setCompletenessFilter} options={[
                  { value: "all", label: "Any" },
                  { value: "low", label: "Below 80%" },
                  { value: "high", label: "80%+" },
                ]} />
                <FilterSelect label="Created by" value={createdByFilter} onChange={setCreatedByFilter} options={[
                  { value: "all", label: "Anyone" },
                  { value: "self", label: "Self signup" },
                  { value: "staff", label: "Staff assisted" },
                ]} />
              </div>
            )}
          </>
        )}
      </div>

      {tab === "review" ? (
        <div className="space-y-2">
          {filteredPending.length === 0 ? (
            <EmptyState message="No profiles waiting for review." />
          ) : (
            filteredPending.map((row) => (
              <Link
                key={row.id}
                href={`/admin/profiles/${row.profileId}`}
                className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-muted/30"
              >
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border">
                  <Image src={row.primaryPhoto} alt="" fill className="object-cover" sizes="56px" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold">{row.fullName}</p>
                    {row.slaBreached && (
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-destructive" aria-label="SLA breach" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {row.city} · {row.method === "selfie" ? "Selfie" : row.govtIdType || "Govt ID"}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    {row.hasHoroscope && (
                      <span className="inline-flex items-center gap-0.5">
                        <FileText className="h-3 w-3" /> Horoscope
                      </span>
                    )}
                    <span className="inline-flex items-center gap-0.5">
                      <Clock3 className="h-3 w-3" /> {formatRelativeHours(row.submittedAt)}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-semibold text-primary">Review</span>
              </Link>
            ))
          )}
        </div>
      ) : (
        <>
          <div className="space-y-2 md:hidden">
            {filteredAll.length === 0 ? (
              <EmptyState message="No profiles match your filters." />
            ) : (
              filteredAll.map((p) => (
                <ProfileCard
                  key={p.id}
                  profile={p}
                  onDelete={() => {
                    if (!session) return
                    void deleteMutation.mutateAsync({ profileId: p.id, staff: session })
                  }}
                />
              ))
            )}
          </div>

          <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-2.5 font-medium">Member</th>
                  <th className="px-3 py-2.5 font-medium">City</th>
                  <th className="px-3 py-2.5 font-medium">Status</th>
                  <th className="px-3 py-2.5 font-medium">%</th>
                  <th className="px-3 py-2.5 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAll.map((p) => (
                  <ProfileRow
                    key={p.id}
                    profile={p}
                    onDelete={() => {
                      if (!session) return
                      void deleteMutation.mutateAsync({ profileId: p.id, staff: session })
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

function ProfileCard({ profile: p, onDelete }: { profile: AdminProfile; onDelete: () => void }) {
  return (
    <article className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-3">
        <div className="relative h-12 w-12 overflow-hidden rounded-lg border border-border">
          <Image src={p.photos[0]?.url ?? "/images/profile-priya-1.png"} alt="" fill className="object-cover" sizes="48px" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{p.fullName}</p>
          <p className="text-xs text-muted-foreground">
            {p.city} · {p.completeness}%
          </p>
        </div>
        <StatusBadge status={p.verificationStatus} />
      </div>
      <div className="mt-3 flex gap-2">
        <Link href={`/admin/profiles/${p.id}`} className="flex-1">
          <Button size="sm" variant="outline" className="w-full rounded-lg">
            View
          </Button>
        </Link>
        {p.accountStatus !== "suspended" && (
          <Button size="sm" variant="ghost" className="rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={onDelete}>
            Delete
          </Button>
        )}
      </div>
    </article>
  )
}

function ProfileRow({ profile: p, onDelete }: { profile: AdminProfile; onDelete: () => void }) {
  return (
    <tr className="border-b border-border/70 last:border-0">
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <div className="relative h-9 w-9 overflow-hidden rounded-md border border-border">
            <Image src={p.photos[0]?.url ?? "/images/profile-priya-1.png"} alt="" fill className="object-cover" sizes="36px" />
          </div>
          <div>
            <p className="font-medium">{p.fullName}</p>
            <p className="text-xs text-muted-foreground">+91 {p.phone}</p>
          </div>
        </div>
      </td>
      <td className="px-3 py-2.5">{p.city}</td>
      <td className="px-3 py-2.5">
        <StatusBadge status={p.verificationStatus} />
      </td>
      <td className="px-3 py-2.5 tabular-nums">{p.completeness}%</td>
      <td className="px-3 py-2.5">
        <div className="flex gap-1">
          <Link href={`/admin/profiles/${p.id}`}>
            <Button size="sm" variant="outline" className="rounded-lg">
              View
            </Button>
          </Link>
          {p.accountStatus !== "suspended" && (
            <Button size="sm" variant="ghost" className="rounded-lg text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={onDelete}>
              Delete
            </Button>
          )}
        </div>
      </td>
    </tr>
  )
}

function StatusBadge({ status }: { status: AdminProfile["verificationStatus"] }) {
  const map = {
    pending: "bg-amber-100 text-amber-900",
    verified: "bg-emerald-100 text-emerald-800",
    rejected: "bg-destructive/10 text-destructive",
    idle: "bg-muted text-muted-foreground",
  }
  return <Badge className={cn("border-transparent capitalize", map[status])}>{status}</Badge>
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-medium text-muted-foreground">{label}</p>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-10 rounded-lg">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border px-4 py-12 text-center">
      <UserRound className="mx-auto h-8 w-8 text-muted-foreground/40" />
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
    </div>
  )
}
