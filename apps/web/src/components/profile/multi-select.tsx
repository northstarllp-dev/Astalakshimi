"use client"

import * as React from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
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
import type { SelectOption } from "@/components/profile/searchable-select"

type MultiSelectProps = {
  values: string[]
  onValuesChange: (values: string[]) => void
  options: SelectOption[] | string[]
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  /** Accessible name for the trigger (the visible text is just a count). */
  ariaLabel?: string
  id?: string
}

function normalizeOptions(options: SelectOption[] | string[]): SelectOption[] {
  return options.map((option) =>
    typeof option === "string" ? { value: option, label: option } : option
  )
}

export function MultiSelect({
  values,
  onValuesChange,
  options,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No results found.",
  className,
  ariaLabel,
  id,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const { contentRef, handleOpenChange } = useBelowViewportScroll()
  const items = React.useMemo(() => normalizeOptions(options), [options])

  const toggle = (value: string) => {
    if (values.includes(value)) {
      onValuesChange(values.filter((v) => v !== value))
      return
    }
    onValuesChange([...values, value])
  }

  const remove = (value: string) => {
    onValuesChange(values.filter((v) => v !== value))
  }

  const labelFor = (value: string) => items.find((item) => item.value === value)?.label ?? value

  return (
    <div className={cn("space-y-2", className)}>
      <Popover open={open} onOpenChange={(next) => handleOpenChange(next, () => setOpen(next))}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            id={id}
            aria-label={ariaLabel}
            className="h-auto min-h-12 w-full justify-between rounded-xl border-[1.5px] border-input bg-card px-4 py-2 font-normal hover:bg-card"
          >
            <span className={cn("truncate text-left", values.length === 0 && "text-muted-foreground")}>
              {values.length > 0 ? `${values.length} selected` : placeholder}
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
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
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList className="min-h-0 max-h-[min(15rem,max(0px,var(--radix-popover-content-available-height,15rem)-2.75rem))] overflow-y-auto">
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {items.map((item) => {
                  const selected = values.includes(item.value)
                  return (
                    <CommandItem
                      key={item.value}
                      value={item.label}
                      onSelect={() => toggle(item.value)}
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
              {labelFor(value)}
              <button
                type="button"
                onClick={() => remove(value)}
                className="rounded-full p-0.5 hover:bg-black/10"
                aria-label={`Remove ${labelFor(value)}`}
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
