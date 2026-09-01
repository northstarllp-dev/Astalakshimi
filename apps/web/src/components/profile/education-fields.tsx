"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SearchableSelect } from "@/components/profile/searchable-select"
import { apiClient } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import type { EducationLevelOption, SpecializationOption } from "@astalakshimi/types"

export const OTHER_OPTION_VALUE = "__other__"

type EducationFieldsProps = {
  educationId?: number | null
  specializationId?: number | null
  otherEducation?: string
  educationStream?: string
  onEducationChange: (value: {
    educationId: number | null
    education: string
    specializationId: number | null
    educationStream: string
    otherEducation: string
  }) => void
  educationClassName?: string
  specializationClassName?: string
  educationMissing?: boolean
  educationError?: string
}

export function EducationFields({
  educationId,
  specializationId,
  otherEducation = "",
  educationStream = "",
  onEducationChange,
  educationClassName,
  specializationClassName,
  educationMissing,
  educationError,
}: EducationFieldsProps) {
  const [levels, setLevels] = React.useState<EducationLevelOption[]>([])
  const [specializations, setSpecializations] = React.useState<SpecializationOption[]>([])
  const [loadingSpecs, setLoadingSpecs] = React.useState(false)
  const [otherSpecSelected, setOtherSpecSelected] = React.useState(false)

  React.useEffect(() => {
    apiClient.educations.listLevels().then(setLevels).catch(console.error)
  }, [])

  React.useEffect(() => {
    if (!educationId) {
      setSpecializations([])
      return
    }

    setLoadingSpecs(true)
    apiClient.educations
      .listSpecializations(educationId)
      .then((items) => setSpecializations(items))
      .catch(console.error)
      .finally(() => setLoadingSpecs(false))
  }, [educationId])

  const isOtherEducation = !educationId && Boolean(otherEducation.trim())
  const isOtherSpecialization =
    Boolean(educationId) && !specializationId && (otherSpecSelected || Boolean(educationStream.trim()))

  React.useEffect(() => {
    if (educationId && !specializationId && educationStream.trim()) {
      setOtherSpecSelected(true)
    }
  }, [educationId, specializationId, educationStream])

  const levelOptions = [
    ...levels.map((level) => ({
      value: String(level.id),
      label: level.name,
    })),
    { value: OTHER_OPTION_VALUE, label: "Others" },
  ]

  const specializationOptions = [
    ...specializations.map((item) => ({
      value: String(item.id),
      label: item.name,
    })),
    { value: OTHER_OPTION_VALUE, label: "Others" },
  ]

  const selectedLevel = levels.find((level) => level.id === educationId)
  const educationSelectValue = educationId
    ? String(educationId)
    : isOtherEducation
      ? OTHER_OPTION_VALUE
      : undefined

  const specializationSelectValue = specializationId
    ? String(specializationId)
    : isOtherSpecialization
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
              onEducationChange({
                educationId: null,
                education: "",
                specializationId: null,
                educationStream: "",
                otherEducation: otherEducation || "",
              })
              setOtherSpecSelected(false)
              return
            }

            const next = levels.find((level) => String(level.id) === value)
            onEducationChange({
              educationId: next?.id ?? null,
              education: next?.name ?? "",
              specializationId: null,
              educationStream: "",
              otherEducation: "",
            })
            setOtherSpecSelected(false)
          }}
          options={levelOptions}
          placeholder="Select highest education"
          searchPlaceholder="Search education…"
          className={educationClassName}
        />
        {isOtherEducation ? (
          <Input
            value={otherEducation}
            onChange={(e) =>
              onEducationChange({
                educationId: null,
                education: e.target.value,
                specializationId: null,
                educationStream: "",
                otherEducation: e.target.value,
              })
            }
            placeholder="Enter your highest education"
            className={educationClassName}
            aria-invalid={educationMissing}
          />
        ) : null}
        {educationError ? <p className="text-xs text-destructive">{educationError}</p> : null}
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Specialization (optional)
        </Label>
        <SearchableSelect
          value={specializationSelectValue}
          onValueChange={(value) => {
            if (value === OTHER_OPTION_VALUE) {
              setOtherSpecSelected(true)
              onEducationChange({
                educationId: educationId ?? null,
                education: selectedLevel?.name ?? "",
                specializationId: null,
                educationStream: educationStream || "",
                otherEducation: "",
              })
              return
            }

            setOtherSpecSelected(false)
            const next = specializations.find((item) => String(item.id) === value)
            onEducationChange({
              educationId: educationId ?? null,
              education: selectedLevel?.name ?? "",
              specializationId: next?.id ?? null,
              educationStream: next?.name ?? "",
              otherEducation: "",
            })
          }}
          options={specializationOptions}
          placeholder={
            !educationId
              ? "Select education first"
              : loadingSpecs
                ? "Loading specializations…"
                : "Select specialization (optional)"
          }
          searchPlaceholder="Search specialization…"
          className={specializationClassName}
          disabled={!educationId || loadingSpecs}
        />
        {isOtherSpecialization ? (
          <Input
            value={educationStream}
            onChange={(e) =>
              onEducationChange({
                educationId: educationId ?? null,
                education: selectedLevel?.name ?? "",
                specializationId: null,
                educationStream: e.target.value,
                otherEducation: "",
              })
            }
            placeholder="Enter your specialization"
            className={specializationClassName}
          />
        ) : null}
      </div>
    </div>
  )
}
