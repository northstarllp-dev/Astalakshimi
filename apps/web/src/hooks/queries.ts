import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { MATCHES } from "@/lib/matches"
import { isPaidMember, loadInvoices, loadSubscription } from "@/lib/plans"
import { markProfileVerified } from "@/lib/portal-access"
import { loadProfile, saveProfile, type SignupData } from "@/lib/profile-store"
import {
  addSavedSearch,
  addSkipped,
  clearAllNotifications,
  getReceivedInterests,
  getRichReceivedInterests,
  getRichSentInterests,
  getMutualMatches,
  getUnreadNotificationCount,
  loadBlocked,
  loadNotifications,
  loadPrivateNotes,
  loadSavedSearches,
  loadSettings,
  loadShortlist,
  loadSkipped,
  markAllNotificationsRead,
  markNotificationRead,
  saveSettings,
  sendInterest,
  toggleShortlist,
  type SavedSearch,
  type UserSettings,
} from "@/lib/user-activity"

export const queryKeys = {
  profile: ["profile"] as const,
  matches: ["matches"] as const,
  paid: ["membership", "paid"] as const,
  subscription: ["membership", "subscription"] as const,
  invoices: ["membership", "invoices"] as const,
  notifications: ["activity", "notifications"] as const,
  unread: ["activity", "notifications", "unread"] as const,
  shortlist: ["activity", "shortlist"] as const,
  skipped: ["activity", "skipped"] as const,
  interests: ["activity", "interests"] as const,
  settings: ["activity", "settings"] as const,
  savedSearches: ["activity", "saved-searches"] as const,
}

export function useProfileQuery() {
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: async () => loadProfile(),
  })
}

export function useSaveProfileMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: SignupData) => {
      saveProfile(data)
      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.profile, data)
    },
  })
}

export function useMarkVerifiedMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => markProfileVerified(),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.profile, data)
    },
  })
}

export function useMatchesQuery() {
  return useQuery({
    queryKey: queryKeys.matches,
    queryFn: async () => MATCHES,
    staleTime: Infinity,
  })
}

export function usePaidQuery() {
  return useQuery({
    queryKey: queryKeys.paid,
    queryFn: async () => isPaidMember(),
  })
}

export function useSubscriptionQuery() {
  return useQuery({
    queryKey: queryKeys.subscription,
    queryFn: async () => loadSubscription(),
  })
}

export function useInvoicesQuery() {
  return useQuery({
    queryKey: queryKeys.invoices,
    queryFn: async () => loadInvoices(),
  })
}

export function useNotificationsQuery() {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: async () => loadNotifications(),
  })
}

export function useUnreadCountQuery() {
  return useQuery({
    queryKey: queryKeys.unread,
    queryFn: async () => getUnreadNotificationCount(),
  })
}

export function useNotificationMutations() {
  const queryClient = useQueryClient()
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["activity", "notifications"] })
  }
  return {
    markRead: useMutation({
      mutationFn: async (id: string) => markNotificationRead(id),
      onSuccess: invalidate,
    }),
    markAllRead: useMutation({
      mutationFn: async () => markAllNotificationsRead(),
      onSuccess: invalidate,
    }),
    clearAll: useMutation({
      mutationFn: async () => clearAllNotifications(),
      onSuccess: invalidate,
    }),
  }
}

export function useShortlistQuery() {
  return useQuery({
    queryKey: queryKeys.shortlist,
    queryFn: async () => loadShortlist(),
  })
}

export function useSkippedQuery() {
  return useQuery({
    queryKey: queryKeys.skipped,
    queryFn: async () => loadSkipped(),
  })
}

export function useToggleShortlistMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (profileId: string) => toggleShortlist(profileId),
    onSuccess: (ids) => {
      queryClient.setQueryData(queryKeys.shortlist, ids)
      void queryClient.invalidateQueries({ queryKey: queryKeys.interests })
    },
  })
}

export function useSkipMatchMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (profileId: string) => addSkipped(profileId),
    onSuccess: (ids) => {
      queryClient.setQueryData(queryKeys.skipped, ids)
    },
  })
}

export function useSendInterestMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (profileId: string) => sendInterest(profileId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.interests })
    },
  })
}

export function useInterestsQuery() {
  return useQuery({
    queryKey: queryKeys.interests,
    queryFn: async () => ({
      received: getRichReceivedInterests(),
      sent: getRichSentInterests(),
      mutual: getMutualMatches(),
      pendingCount: getReceivedInterests().filter((item) => item.status === "pending").length,
      shortlisted: loadShortlist(),
      blocked: loadBlocked(),
      notes: loadPrivateNotes(),
    }),
  })
}

export function useInvalidateInterests() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.interests })
    void queryClient.invalidateQueries({ queryKey: queryKeys.shortlist })
  }
}

export function useSettingsQuery() {
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: async () => loadSettings(),
  })
}

export function useSaveSettingsMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (settings: UserSettings) => {
      saveSettings(settings)
      return settings
    },
    onSuccess: (settings) => {
      queryClient.setQueryData(queryKeys.settings, settings)
    },
  })
}

export function useSavedSearchesQuery() {
  return useQuery({
    queryKey: queryKeys.savedSearches,
    queryFn: async () => loadSavedSearches(),
  })
}

export function useAddSavedSearchMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (search: Omit<SavedSearch, "id">) => addSavedSearch(search),
    onSuccess: (items) => {
      queryClient.setQueryData(queryKeys.savedSearches, items)
    },
  })
}
