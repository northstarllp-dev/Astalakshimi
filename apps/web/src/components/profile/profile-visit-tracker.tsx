"use client"

import { useEffect } from "react"
import { apiClient, isVerificationPendingError } from "@/lib/api-client"
import { useProfileQuery } from "@/hooks/queries"
import { canInteract } from "@/lib/portal-access"

/**
 * Records a profile view for activity ("who viewed you").
 * Skipped while verification is pending — browse teaser stays open, but
 * visit signals are an interaction and the API returns 403 until verified.
 */
export function ProfileVisitTracker({ profileId }: { profileId: string }) {
  const { data: profile } = useProfileQuery()
  const allowed = canInteract(profile ?? null)

  useEffect(() => {
    if (!apiClient.getToken() || !allowed || !profileId) return

    let cancelled = false
    void apiClient.profiles.recordVisit(profileId).catch((err) => {
      if (cancelled) return
      // Expected when status flips mid-browse; never console.error — Next overlays it.
      if (isVerificationPendingError(err)) return
      console.warn("[ProfileVisitTracker] failed to record visit", err)
    })

    return () => {
      cancelled = true
    }
  }, [profileId, allowed])

  return null
}
