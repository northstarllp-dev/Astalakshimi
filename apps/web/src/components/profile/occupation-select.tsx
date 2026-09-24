"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { SearchableSelect } from "@/components/profile/searchable-select"
import { cn } from "@/lib/utils"
import { EMPLOYMENT_STATUSES } from "@/lib/profile-store"

import { REQUIRED_FIELD_INVALID_CLASS } from "@/lib/profile-completeness"

/**
 * Occupation is now flat: an `employmentStatus` enum (Employed / Business
 * Owner / Freelancer / Not Working) plus a free-text `profession`. No catalog
 * FK ids and no backend autocomplete — everything is client-side.
 */
type OccupationSelectProps = {
  employmentStatus?: string
  profession?: string
  onOccupationChange: (value: { employmentStatus: string; profession: string }) => void
  className?: string
  missing?: boolean
  error?: string
}

export function OccupationSelect({
  employmentStatus = "",
  profession = "",
  onOccupationChange,
  className,
  missing,
  error,
}: OccupationSelectProps) {
  const options = EMPLOYMENT_STATUSES.map((status) => ({ value: status, label: status }))

  return (
    <div className="space-y-2">
      <SearchableSelect
        value={employmentStatus || undefined}
        onValueChange={(value) => onOccupationChange({ employmentStatus: value, profession })}
        options={options}
        placeholder="Select employment status"
        searchPlaceholder="Search employment status…"
        emptyText="No results found."
        className={cn(missing && REQUIRED_FIELD_INVALID_CLASS, className)}
      />
      <Input
        value={profession}
        onChange={(e) => onOccupationChange({ employmentStatus, profession: e.target.value })}
        placeholder="Enter your profession / designation"
        className={className}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
