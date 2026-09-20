"use client"

import * as React from "react"
import { SearchableSelect } from "@/components/profile/searchable-select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  findCommunityByLabel,
  getCommunityLabelsForReligion,
} from "@/lib/community-data"
import { cn } from "@/lib/utils"

type CommunityFieldsProps = {
  religion: string
  caste: string
  communitySlug?: string
  subcaste?: string
  gotra?: string
  onChange: (value: {
    caste?: string
    communitySlug?: string
    subcaste?: string
    gotra?: string
  }) => void
  casteRequired?: boolean
  casteMissing?: boolean
  casteError?: string
  casteClassName?: string
  disabled?: boolean
}

export function CommunityFields({
  religion,
  caste,
  communitySlug = "",
  subcaste = "",
  gotra = "",
  onChange,
  casteMissing,
  casteClassName,
  disabled,
}: CommunityFieldsProps) {
  const showGotra = religion === "Hindu" || religion === "Jain"

  const communityOptions = React.useMemo(() => {
    const list = getCommunityLabelsForReligion(religion)
    if (caste && !list.includes(caste)) {
      // Legacy / out-of-catalog value: show for display but user must re-pick from catalog to save cleanly.
      return [caste, ...list]
    }
    return list
  }, [religion, caste])

  return (
    <div className="space-y-4">
      <SearchableSelect
        value={caste}
        onValueChange={(next) => {
          const match = findCommunityByLabel(next, religion)
          onChange({
            caste: next,
            communitySlug: match?.slug ?? "",
            subcaste: next === caste ? subcaste : "",
          })
        }}
        options={communityOptions}
        placeholder={religion ? "Select caste / community…" : "Select religion first"}
        searchPlaceholder="Search caste…"
        emptyText="No matching community found."
        disabled={disabled || !religion}
        className={cn(casteMissing && casteClassName)}
        allowCustom={false}
      />

      <div className="space-y-2">
        <Label htmlFor="community-subcaste" className="text-sm text-muted-foreground">
          Subcaste (optional)
        </Label>
        <Input
          id="community-subcaste"
          value={subcaste}
          onChange={(e) => onChange({ subcaste: e.target.value })}
          placeholder="Type subcaste if applicable"
          maxLength={100}
          disabled={disabled}
        />
      </div>

      {showGotra ? (
        <div className="space-y-2">
          <Label htmlFor="community-gotra" className="text-sm text-muted-foreground">
            Gotra (optional)
          </Label>
          <Input
            id="community-gotra"
            value={gotra}
            onChange={(e) => onChange({ gotra: e.target.value })}
            placeholder="Type gotra if applicable"
            maxLength={100}
            disabled={disabled}
          />
        </div>
      ) : null}

      {communitySlug ? (
        <input type="hidden" name="communitySlug" value={communitySlug} readOnly />
      ) : null}
    </div>
  )
}
