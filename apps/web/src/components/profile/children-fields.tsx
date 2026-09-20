"use client"

import * as React from "react"
import { Label } from "@/components/ui/label"
import { TapCard } from "@/components/signup/shared"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { maritalAsksChildren } from "@/lib/identity-fields"

const CHILD_COUNTS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

type ChildrenFieldsProps = {
  maritalStatus?: string
  hasChildren?: boolean
  childrenCount?: number
  childrenLivingWithMe?: boolean | null
  onChange: (value: {
    hasChildren?: boolean
    childrenCount?: number
    childrenLivingWithMe?: boolean | null
  }) => void
  errors?: {
    hasChildren?: string
    childrenCount?: string
    childrenLivingWithMe?: string
  }
  prefix?: string
}

export function ChildrenFields({
  maritalStatus,
  hasChildren = false,
  childrenCount = 1,
  childrenLivingWithMe,
  onChange,
  errors,
  prefix = "",
}: ChildrenFieldsProps) {
  if (!maritalAsksChildren(maritalStatus)) return null

  return (
    <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
      <div className="space-y-2">
        <Label>{prefix}Do they have children?</Label>
        <div className="grid grid-cols-2 gap-2.5">
          <TapCard selected={hasChildren === true} onClick={() => onChange({ hasChildren: true })} title="Yes" />
          <TapCard
            selected={hasChildren === false}
            onClick={() => onChange({ hasChildren: false, childrenCount: 0, childrenLivingWithMe: null })}
            title="No"
          />
        </div>
        {errors?.hasChildren && <p className="text-xs text-destructive">{errors.hasChildren}</p>}
      </div>

      {hasChildren && (
        <>
          <div className="space-y-2">
            <Label>Number of children</Label>
            <Select
              value={String(childrenCount || 1)}
              onValueChange={(value) => onChange({ childrenCount: Number(value) })}
            >
              <SelectTrigger className="w-full" aria-label="Number of children">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {CHILD_COUNTS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors?.childrenCount && <p className="text-xs text-destructive">{errors.childrenCount}</p>}
          </div>
          <div className="space-y-2">
            <Label>Do the children live with them?</Label>
            <div className="grid grid-cols-2 gap-2.5">
              <TapCard
                selected={childrenLivingWithMe === true}
                onClick={() => onChange({ childrenLivingWithMe: true })}
                title="Yes"
              />
              <TapCard
                selected={childrenLivingWithMe === false}
                onClick={() => onChange({ childrenLivingWithMe: false })}
                title="No"
              />
            </div>
            {errors?.childrenLivingWithMe && (
              <p className="text-xs text-destructive">{errors.childrenLivingWithMe}</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
