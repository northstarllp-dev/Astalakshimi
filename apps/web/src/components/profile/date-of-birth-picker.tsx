"use client"

import * as React from "react"
import { format } from "date-fns"
import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

type DateOfBirthPickerProps = {
  dobDay: string
  dobMonth: string
  dobYear: string
  onChange: (parts: { dobDay: string; dobMonth: string; dobYear: string }) => void
  className?: string
  disabled?: boolean
}

function parseDob(day: string, month: string, year: string): Date | undefined {
  if (!day || !month || !year) return undefined
  const parsed = new Date(Number(year), Number(month) - 1, Number(day))
  if (Number.isNaN(parsed.getTime())) return undefined
  return parsed
}

function toDobParts(date: Date) {
  return {
    dobDay: String(date.getDate()).padStart(2, "0"),
    dobMonth: String(date.getMonth() + 1).padStart(2, "0"),
    dobYear: String(date.getFullYear()),
  }
}

export function DateOfBirthPicker({
  dobDay,
  dobMonth,
  dobYear,
  onChange,
  className,
  disabled,
}: DateOfBirthPickerProps) {
  const [open, setOpen] = React.useState(false)
  const selected = parseDob(dobDay, dobMonth, dobYear)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-12 w-full justify-start rounded-xl border-[1.5px] border-input bg-card px-4 text-left font-normal hover:bg-card",
            !selected && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selected ? format(selected, "dd MMM yyyy") : "Pick date of birth"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => {
            if (!date) return
            onChange(toDobParts(date))
            setOpen(false)
          }}
          defaultMonth={selected}
          captionLayout="dropdown"
          startMonth={new Date(1950, 0)}
          endMonth={new Date(new Date().getFullYear() - 18, 11)}
          disabled={(date) => date > new Date(new Date().setFullYear(new Date().getFullYear() - 18))}
        />
      </PopoverContent>
    </Popover>
  )
}
