"use client"

import * as React from "react"
import { SearchableSelect } from "@/components/profile/searchable-select"
import {
  getCommunitiesForReligion,
  getSubcastesForCommunity,
  getGotrasForReligion,
} from "@/lib/community-data"
import { cn } from "@/lib/utils"

type CommunityFieldsProps = {
  religion: string
  caste: string
  subcaste?: string
  gotra?: string
  onChange: (value: { caste?: string; subcaste?: string; gotra?: string }) => void
  casteRequired?: boolean
  casteMissing?: boolean
  casteError?: string
  casteClassName?: string
  disabled?: boolean
}

export function CommunityFields({
  religion,
  caste,
  subcaste = "",
  gotra = "",
  onChange,
  casteMissing,
  casteClassName,
  disabled,
}: CommunityFieldsProps) {
  const showGotra = religion === "Hindu" || religion === "Jain"

  const communityOptions = React.useMemo(() => {
    const list = getCommunitiesForReligion(religion)
    if (caste && !list.includes(caste)) {
      return [caste, ...list]
    }
    return list
  }, [religion, caste])

  const subcasteOptions = React.useMemo(() => {
    const list = getSubcastesForCommunity(caste, religion)
    if (subcaste && !list.includes(subcaste)) {
      return [subcaste, ...list]
    }
    return list
  }, [caste, religion, subcaste])

  const gotraOptions = React.useMemo(() => {
    const list = getGotrasForReligion(religion)
    if (gotra && !list.includes(gotra)) {
      return [gotra, ...list]
    }
    return list
  }, [religion, gotra])

  return (
    <div className="space-y-4">
      <SearchableSelect
        value={caste}
        onValueChange={(next) =>
          onChange({
            caste: next,
            subcaste: next === caste ? subcaste : "",
          })
        }
        options={communityOptions}
        placeholder={religion ? "Select caste / community…" : "Select religion first"}
        searchPlaceholder="Search or type caste…"
        emptyText="No matching community found."
        disabled={disabled || !religion}
        className={cn(casteMissing && casteClassName)}
        allowCustom={true}
      />

      <SearchableSelect
        value={subcaste}
        onValueChange={(next) => onChange({ subcaste: next })}
        options={subcasteOptions}
        placeholder={caste ? "Select subcaste (optional)…" : "Select caste first"}
        searchPlaceholder="Search or type subcaste…"
        emptyText="No matching subcaste found."
        disabled={disabled || !caste}
        allowCustom={true}
      />

      {showGotra ? (
        <SearchableSelect
          value={gotra}
          onValueChange={(next) => onChange({ gotra: next })}
          options={gotraOptions}
          placeholder="Select gotra (optional)…"
          searchPlaceholder="Search or type gotra…"
          emptyText="No matching gotra found."
          disabled={disabled}
          allowCustom={true}
        />
      ) : null}
    </div>
  )
}
