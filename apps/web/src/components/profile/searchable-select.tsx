"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
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

export type SelectOption = {
  value: string
  label: string
}

type SearchableSelectProps = {
  value?: string
  onValueChange: (value: string) => void
  options: SelectOption[] | string[]
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  disabled?: boolean
  allowCustom?: boolean
}

function normalizeOptions(options: SelectOption[] | string[]): SelectOption[] {
  return options.map((option) =>
    typeof option === "string" ? { value: option, label: option } : option
  )
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No results found.",
  className,
  disabled,
  allowCustom = true,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const items = React.useMemo(() => normalizeOptions(options), [options])
  const selected = items.find((item) => item.value === value)

  const trimmedSearch = search.trim()
  const hasExactMatch = React.useMemo(() => {
    if (!trimmedSearch) return true
    return items.some(
      (item) =>
        item.label.toLowerCase() === trimmedSearch.toLowerCase() ||
        item.value.toLowerCase() === trimmedSearch.toLowerCase()
    )
  }, [items, trimmedSearch])

  return (
    <Popover open={open} onOpenChange={(next) => {
      setOpen(next)
      if (!next) setSearch("")
    }}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-12 w-full justify-between rounded-xl border-[1.5px] border-input bg-card px-4 font-normal text-[0.9375rem] hover:bg-card",
            !selected && !value && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{selected?.label ?? (value || placeholder)}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command
          filter={(itemValue, searchStr) =>
            itemValue.toLowerCase().includes(searchStr.trim().toLowerCase()) ? 1 : 0
          }
        >
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              <div className="py-2 text-center">
                <p className="text-xs text-muted-foreground">{emptyText}</p>
                {allowCustom && trimmedSearch ? (
                  <Button
                    type="button"
                    variant="soft"
                    size="sm"
                    className="mt-3 text-xs"
                    onClick={() => {
                      onValueChange(trimmedSearch)
                      setOpen(false)
                      setSearch("")
                    }}
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                    Use &ldquo;{trimmedSearch}&rdquo;
                  </Button>
                ) : null}
              </div>
            </CommandEmpty>
            <CommandGroup>
              {allowCustom && trimmedSearch && !hasExactMatch ? (
                <CommandItem
                  value={`__add__:${trimmedSearch}`}
                  onSelect={() => {
                    onValueChange(trimmedSearch)
                    setOpen(false)
                    setSearch("")
                  }}
                  className="font-medium text-primary cursor-pointer"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Use &ldquo;{trimmedSearch}&rdquo; (Add custom)
                </CommandItem>
              ) : null}
              {items.map((item) => (
                <CommandItem
                  key={item.value}
                  value={item.label}
                  onSelect={() => {
                    onValueChange(item.value)
                    setOpen(false)
                    setSearch("")
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === item.value ? "opacity-100" : "opacity-0"
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
