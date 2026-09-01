"use client"

import * as React from "react"
import { SearchableSelect } from "@/components/profile/searchable-select"
import { apiClient } from "@/lib/api-client"
import type { OccupationOption } from "@astalakshimi/types"

type OccupationSelectProps = {
  occupationId?: number | null
  onOccupationChange: (value: { occupationId: number | null; occupation: string; profession: string }) => void
  className?: string
}

export function OccupationSelect({ occupationId, onOccupationChange, className }: OccupationSelectProps) {
  const [occupations, setOccupations] = React.useState<OccupationOption[]>([])
  const [loading, setLoading] = React.useState(true)
  const [loadError, setLoadError] = React.useState<string | null>(null)

  React.useEffect(() => {
    setLoading(true)
    setLoadError(null)
    apiClient.careers
      .listOccupations()
      .then(setOccupations)
      .catch((error) => {
        console.error(error)
        setOccupations([])
        setLoadError("Could not load occupations. Please refresh and try again.")
      })
      .finally(() => setLoading(false))
  }, [])

  const options = occupations.map((item) => ({
    value: String(item.id),
    label: item.category ? `${item.name} · ${item.category}` : item.name,
  }))

  return (
    <SearchableSelect
      value={occupationId ? String(occupationId) : undefined}
      onValueChange={(value) => {
        const next = occupations.find((item) => String(item.id) === value)
        onOccupationChange({
          occupationId: next?.id ?? null,
          occupation: next?.name ?? "",
          profession: next?.name ?? "",
        })
      }}
      options={options}
      placeholder={loading ? "Loading occupations…" : "Select occupation"}
      searchPlaceholder="Search occupation…"
      emptyText={
        loading
          ? "Loading occupations…"
          : loadError ?? (options.length === 0 ? "No occupations available." : "No results found.")
      }
      disabled={loading || Boolean(loadError)}
      className={className}
    />
  )
}
