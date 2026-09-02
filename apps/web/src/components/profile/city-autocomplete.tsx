"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Loader2, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { apiClient } from "@/lib/api-client"
import type { CityAutocompleteResult } from "@astalakshimi/types"

type CityAutocompleteProps = {
  city?: string
  state?: string
  onCityChange: (value: { city: string; state: string; cityId?: number }) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  disabled?: boolean
  stateFilter?: string
}

function useDebouncedValue<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = React.useState(value)

  React.useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(timer)
  }, [value, delay])

  return debounced
}

async function searchNominatimDirect(query: string): Promise<CityAutocompleteResult[]> {
  try {
    const params = new URLSearchParams({
      q: query.trim(),
      format: "json",
      addressdetails: "1",
      limit: "10",
      countrycodes: "in",
    })
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params.toString()}`, {
      headers: {
        Accept: "application/json",
      },
    })
    if (!res.ok) return []
    const list = await res.json()
    const seen = new Set<string>()
    const results: CityAutocompleteResult[] = []
    for (const row of list) {
      const addr = row.address || {}
      const name =
        addr.city ||
        addr.town ||
        addr.village ||
        addr.suburb ||
        addr.county ||
        row.display_name?.split(",")[0]?.trim()
      const state = addr.state || addr.state_district || ""
      const country = addr.country || "India"
      if (!name) continue
      const key = `${name.toLowerCase()}|${state.toLowerCase()}`
      if (seen.has(key)) continue
      seen.add(key)
      results.push({
        id: row.place_id,
        name,
        state,
        country,
        label: state ? `${name}, ${state}` : name,
      })
    }
    return results
  } catch {
    return []
  }
}

export function CityAutocomplete({
  city = "",
  state = "",
  onCityChange,
  placeholder = "Search city…",
  searchPlaceholder = "Type city name…",
  emptyText = "No cities found.",
  className,
  disabled,
  stateFilter,
}: CityAutocompleteProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState(city)
  const [results, setResults] = React.useState<CityAutocompleteResult[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const debouncedQuery = useDebouncedValue(query)

  React.useEffect(() => {
    setQuery(city)
  }, [city])

  React.useEffect(() => {
    if (!open) return
    const trimmed = debouncedQuery.trim()
    if (trimmed.length < 2) {
      setResults([])
      setError(null)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    apiClient.locations
      .autocomplete(trimmed, stateFilter)
      .then(async (rows) => {
        if (!cancelled) {
          if (rows && rows.length > 0) {
            setResults(rows)
            setError(null)
          } else {
            const direct = await searchNominatimDirect(trimmed)
            if (!cancelled) {
              setResults(direct)
              setError(null)
            }
          }
        }
      })
      .catch(async () => {
        if (!cancelled) {
          const direct = await searchNominatimDirect(trimmed)
          if (!cancelled) {
            setResults(direct)
            setError(null)
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [debouncedQuery, open, stateFilter])

  const displayValue = city ? (state ? `${city}, ${state}` : city) : ""
  const trimmed = debouncedQuery.trim()

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQuery(city)
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-12 w-full justify-between rounded-xl border-[1.5px] border-input bg-card px-4 font-normal text-[0.9375rem] hover:bg-card",
            !displayValue && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">{displayValue || placeholder}</span>
          {loading ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin opacity-50" />
          ) : (
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList className="max-h-60 sm:max-h-72 overflow-y-auto">
            <CommandEmpty>
              <div className="py-2 text-center">
                <p className="text-xs text-muted-foreground">
                  {trimmed.length < 2
                    ? "Type at least 2 characters."
                    : loading
                      ? "Searching…"
                      : error
                        ? error
                        : emptyText}
                </p>
                {trimmed.length >= 2 && !loading && (
                  <Button
                    type="button"
                    variant="soft"
                    size="sm"
                    className="mt-3 text-xs"
                    onClick={() => {
                      onCityChange({ city: trimmed, state: stateFilter || "" })
                      setQuery(trimmed)
                      setOpen(false)
                    }}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Use &ldquo;{trimmed}&rdquo;
                  </Button>
                )}
              </div>
            </CommandEmpty>
            <CommandGroup>
              {trimmed.length >= 2 &&
                !results.some((r) => r.name.toLowerCase() === trimmed.toLowerCase()) && (
                  <CommandItem
                    value={`__custom__:${trimmed}`}
                    onSelect={() => {
                      onCityChange({ city: trimmed, state: stateFilter || "" })
                      setQuery(trimmed)
                      setOpen(false)
                    }}
                    className="font-medium text-primary cursor-pointer"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Use &ldquo;{trimmed}&rdquo; {stateFilter ? `(${stateFilter})` : ""}
                  </CommandItem>
                )}
              {results.map((item) => (
                <CommandItem
                  key={`${item.id}-${item.label}`}
                  value={item.label}
                  onSelect={() => {
                    onCityChange({ city: item.name, state: item.state, cityId: item.id })
                    setQuery(item.name)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      city === item.name && state === item.state ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
