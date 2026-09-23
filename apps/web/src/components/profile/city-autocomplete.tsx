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
import { useBelowViewportScroll } from "@/components/profile/use-below-viewport-scroll"
import { searchCities } from "@astalakshimi/reference"
import type { CitySearchResult } from "@astalakshimi/reference"

type CityAutocompleteProps = {
  city?: string
  state?: string
  citySlug?: string
  onCityChange: (value: {
    city: string
    state: string
    citySlug?: string
    country?: string
  }) => void
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
  citySlug,
  onCityChange,
  placeholder = "Search city…",
  searchPlaceholder = "Type city name…",
  emptyText = "No cities found in catalog. Try another spelling.",
  className,
  disabled,
  stateFilter,
}: CityAutocompleteProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState(city)
  const [results, setResults] = React.useState<CitySearchResult[]>([])
  const [loading, setLoading] = React.useState(false)
  const debouncedQuery = useDebouncedValue(query)
  const { contentRef, handleOpenChange } = useBelowViewportScroll()

  React.useEffect(() => {
    setQuery(city)
  }, [city])

  React.useEffect(() => {
    if (!open) return
    const trimmed = debouncedQuery.trim()
    if (trimmed.length < 2) {
      setResults([])
      return
    }

    // Catalog search is local (GeoNames-backed reference package) so register
    // and logged-out forms work without a JWT. API locations remain for server-side resolve.
    setLoading(true)
    try {
      const rows = searchCities(trimmed, {
        state: stateFilter,
        limit: 10,
      })
      setResults(rows || [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [debouncedQuery, open, stateFilter])

  const displayValue = city ? (state ? `${city}, ${state}` : city) : ""
  const trimmed = debouncedQuery.trim()

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        handleOpenChange(next, () => {
          if (!next) setQuery(city)
        })
        setOpen(next)
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
      {/* Always open below the trigger (never flip over the form) and keep the
          list capped to the space left under it so the panel stays on-screen. */}
      <PopoverContent
        ref={contentRef}
        side="bottom"
        avoidCollisions={false}
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={searchPlaceholder}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList className="min-h-0 max-h-[min(15rem,max(0px,var(--radix-popover-content-available-height,15rem)-2.75rem))] overflow-y-auto">
            <CommandEmpty>
              <div className="py-2 text-center">
                <p className="text-xs text-muted-foreground">
                  {trimmed.length < 2
                    ? "Type at least 2 characters."
                    : loading
                      ? "Searching…"
                      : emptyText}
                </p>
              </div>
            </CommandEmpty>
            <CommandGroup>
              {results.map((item) => (
                <CommandItem
                  key={`${item.slug}-${item.label}`}
                  value={item.label}
                  onSelect={() => {
                    onCityChange({
                      city: item.name,
                      state: item.state,
                      citySlug: item.slug,
                      country: item.country,
                    })
                    setQuery(item.name)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      (citySlug && item.slug === citySlug) ||
                        (city === item.name && state === item.state)
                        ? "opacity-100"
                        : "opacity-0",
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
