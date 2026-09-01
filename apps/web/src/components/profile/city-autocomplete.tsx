"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Loader2 } from "lucide-react"
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
      .then((rows) => {
        if (!cancelled) {
          setResults(rows)
          setError(null)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setResults([])
          setError(err instanceof Error ? err.message : "City search failed.")
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

  return (
    <Popover open={open} onOpenChange={setOpen}>
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
          <CommandList>
            <CommandEmpty>
              {debouncedQuery.trim().length < 2
                ? "Type at least 2 characters."
                : loading
                  ? "Searching…"
                  : error
                    ? error
                    : emptyText}
            </CommandEmpty>
            <CommandGroup>
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
