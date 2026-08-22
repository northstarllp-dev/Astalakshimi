"use client";

import { useEffect } from "react";
import { apiClient } from "@/lib/api-client";

export function ProfileVisitTracker({ profileId }: { profileId: string }) {
  useEffect(() => {
    // Only track if we have a token (user is logged in)
    if (apiClient.getToken()) {
      apiClient.profiles.recordVisit(profileId).catch((err) => {
        console.error("Failed to record profile visit", err);
      });
    }
  }, [profileId]);

  return null;
}
