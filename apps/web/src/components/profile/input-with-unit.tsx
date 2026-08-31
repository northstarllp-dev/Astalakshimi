"use client"

import * as React from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import {
  convertWeightAmount,
  formatBirthTime,
  formatWeight,
  maskClockInput,
  maskWeightInput,
  parseBirthTime,
  parseWeight,
  type Meridiem,
  type WeightUnit,
} from "@/lib/input-units"

type InputWithUnitProps = {
  value: string
  onChange: (value: string) => void
  unit: string
  units?: string[]
  onUnitChange?: (unit: string) => void
  placeholder?: string
  unitAriaLabel?: string
  disabled?: boolean
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]
  maxLength?: number
  autoComplete?: string
  "aria-label"?: string
  className?: string
}

export function InputWithUnit({
  value,
  onChange,
  unit,
  units,
  onUnitChange,
  placeholder,
  unitAriaLabel,
  disabled,
  inputMode,
  maxLength,
  autoComplete = "off",
  "aria-label": ariaLabel,
  className,
}: InputWithUnitProps) {
  const selectable = Boolean(onUnitChange && units && units.length > 1)

  return (
    <div
      className={cn(
        "flex h-12 w-full items-stretch overflow-hidden rounded-xl border-[1.5px] border-input bg-card transition-all duration-150",
        "focus-within:border-primary focus-within:shadow-[0_0_0_3px_rgba(124,21,53,0.10)]",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        inputMode={inputMode}
        maxLength={maxLength}
        autoComplete={autoComplete}
        aria-label={ariaLabel}
        className="min-w-0 flex-1 bg-transparent px-4 text-base outline-none placeholder:text-muted-foreground/60 md:text-sm"
      />
      <div className="my-2.5 w-px shrink-0 bg-border" aria-hidden />
      {selectable ? (
        <Select value={unit} onValueChange={onUnitChange} disabled={disabled}>
          <SelectTrigger
            size="sm"
            aria-label={unitAriaLabel}
            className="h-full w-20 shrink-0 rounded-none border-0 bg-transparent px-2 text-sm font-semibold shadow-none focus-visible:border-transparent focus-visible:ring-0 data-[size=sm]:h-full"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end">
            {units!.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : (
        <span className="flex w-20 shrink-0 items-center justify-center px-2 text-sm font-semibold text-foreground">
          {unit}
        </span>
      )}
    </div>
  )
}

export function BirthTimeInput({
  value,
  onChange,
  className,
}: {
  value: string
  onChange: (value: string) => void
  className?: string
}) {
  const { clock, meridiem } = parseBirthTime(value)

  return (
    <InputWithUnit
      value={clock}
      onChange={(next) => onChange(formatBirthTime(maskClockInput(next), meridiem))}
      placeholder="08:30"
      inputMode="numeric"
      maxLength={5}
      aria-label="Birth time"
      unit={meridiem}
      units={["AM", "PM"]}
      onUnitChange={(next) => onChange(formatBirthTime(clock, next as Meridiem))}
      unitAriaLabel="AM or PM"
      className={className}
    />
  )
}

export function WeightInput({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  const { amount, unit } = parseWeight(value)

  return (
    <InputWithUnit
      value={amount}
      onChange={(next) => onChange(formatWeight(maskWeightInput(next), unit))}
      placeholder="58"
      inputMode="decimal"
      aria-label="Weight"
      unit={unit}
      units={["kg", "lbs"]}
      onUnitChange={(next) => {
        const to = next as WeightUnit
        onChange(formatWeight(convertWeightAmount(amount, unit, to), to))
      }}
      unitAriaLabel="Weight unit"
    />
  )
}
