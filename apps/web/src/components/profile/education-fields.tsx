"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SearchableSelect } from "@/components/profile/searchable-select"
import { cn } from "@/lib/utils"
import { EDUCATION_LEVELS } from "@/lib/profile-store"

/**
 * Education is now flat: an `educationLevel` enum (Bachelors / Masters / ...)
 * plus a free-text `degree` (degree / specialization / stream). No catalog
 * FK ids and no backend autocomplete — everything is client-side.
 *
 * "Others" reveals a free-text input whose value is stored in `degree`
 * (with `educationLevel` cleared), so unusual educations are still
 * representable without a catalog table.
 */
type EducationFieldsProps = {
  educationLevel?: string
  degree?: string
  onEducationChange: (value: { educationLevel: string; degree: string }) => void
  educationClassName?: string
  degreeClassName?: string
  educationMissing?: boolean
  educationError?: string
}

export const OTHER_OPTION_VALUE = "__other__"

export function EducationFields({
  educationLevel = "",
  degree = "",
  onEducationChange,
  educationClassName,
  degreeClassName,
  educationMissing,
  educationError,
}: EducationFieldsProps) {
  const isOtherEducation = !educationLevel && Boolean(degree.trim())

  const levelOptions = [
    ...EDUCATION_LEVELS.map((level) => ({ value: level, label: level })),
    { value: OTHER_OPTION_VALUE, label: "Others" },
  ]

  const educationSelectValue = educationLevel
    ? educationLevel
    : isOtherEducation
      ? OTHER_OPTION_VALUE
      : undefined

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label
          className={cn(
            "text-xs font-semibold tracking-wide text-muted-foreground uppercase",
            educationMissing && "text-destructive",
          )}
        >
          Highest education
          <span className="ml-0.5 text-destructive">*</span>
        </Label>
        <SearchableSelect
          value={educationSelectValue}
          onValueChange={(value) => {
            if (value === OTHER_OPTION_VALUE) {
              onEducationChange({ educationLevel: "", degree: degree || "" })
              return
            }
            onEducationChange({ educationLevel: value, degree })
          }}
          options={levelOptions}
          placeholder="Select highest education"
          searchPlaceholder="Search education…"
          className={educationClassName}
        />
        {isOtherEducation ? (
          <Input
            value={degree}
            onChange={(e) => onEducationChange({ educationLevel: "", degree: e.target.value })}
            placeholder="Enter your highest education"
            className={educationClassName}
            aria-invalid={educationMissing}
          />
        ) : null}
        {educationError ? <p className="text-xs text-destructive">{educationError}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Degree / specialization (optional)
        </Label>
        <Input
          value={degree}
          onChange={(e) =>
            onEducationChange({
              educationLevel,
              degree: e.target.value,
            })
          }
          placeholder="e.g. B.Tech Computer Science"
          className={degreeClassName}
        />
      </div>
    </div>
  )
}
