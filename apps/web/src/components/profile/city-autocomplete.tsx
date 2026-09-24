"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react"
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
import { Badge } from "@/components/ui/badge"
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

/**
 * Multi-select of catalog cities. Stored values are city names (`item.name`),
 * the same string identity saves and the matcher compares to `profiles.city`.
 */
export function CityMultiSelect({
  values,
  onValuesChange,
  placeholder = "Search cities…",
  searchPlaceholder = "Type a city name…",
  emptyText = "No cities found. Try another spelling.",
  className,
  ariaLabel = "Preferred locations",
}: {
  values: string[]
  onValuesChange: (values: string[]) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  ariaLabel?: string
}) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<CitySearchResult[]>([])
  const [loading, setLoading] = React.useState(false)
  const debouncedQuery = useDebouncedValue(query)
  const { contentRef, handleOpenChange } = useBelowViewportScroll()

  React.useEffect(() => {
    if (!open) return
    const trimmed = debouncedQuery.trim()
    if (trimmed.length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      setResults(searchCities(trimmed, { limit: 10 }) || [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [debouncedQuery, open])

  const toggle = (name: string) => {
    const key = name.trim()
    if (!key) return
    const exists = values.some((value) => value.toLowerCase() === key.toLowerCase())
    onValuesChange(
      exists ? values.filter((value) => value.toLowerCase() !== key.toLowerCase()) : [...values, key],
    )
  }

  const trimmed = debouncedQuery.trim()

  return (
    <div className={cn("space-y-2", className)}>
      <Popover
        open={open}
        onOpenChange={(next) => {
          handleOpenChange(next, () => {
            if (!next) setQuery("")
          })
          setOpen(next)
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            aria-label={ariaLabel}
            className="h-auto min-h-12 w-full justify-between rounded-xl border-[1.5px] border-input bg-card px-4 py-2 font-normal hover:bg-card"
          >
            <span className={cn("truncate text-left", values.length === 0 && "text-muted-foreground")}>
              {values.length > 0 ? `${values.length} selected` : placeholder}
            </span>
            {loading ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin opacity-50" />
            ) : (
              <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          ref={contentRef}
          side="bottom"
          avoidCollisions={false}
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
        >
          <Command shouldFilter={false}>
            <CommandInput placeholder={searchPlaceholder} value={query} onValueChange={setQuery} />
            <CommandList className="min-h-0 max-h-[min(15rem,max(0px,var(--radix-popover-content-available-height,15rem)-2.75rem))] overflow-y-auto">
              <CommandEmpty>
                <p className="py-2 text-center text-xs text-muted-foreground">
                  {trimmed.length < 2 ? "Type at least 2 characters." : loading ? "Searching…" : emptyText}
                </p>
              </CommandEmpty>
              <CommandGroup>
                {results.map((item) => {
                  const selected = values.some((value) => value.toLowerCase() === item.name.toLowerCase())
                  return (
                    <CommandItem
                      key={item.slug}
                      value={item.label}
                      onSelect={() => toggle(item.name)}
                    >
                      <Check className={cn("mr-2 h-4 w-4", selected ? "opacity-100" : "opacity-0")} />
                      {item.label}
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((value) => (
            <Badge key={value} variant="secondary" className="gap-1 pr-1">
              {value}
              <button
                type="button"
                onClick={() => toggle(value)}
                className="rounded-full p-0.5 hover:bg-black/10"
                aria-label={`Remove ${value}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
