import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  actionReport,
  adminLogin,
  approveProfile,
  clearAdminSession,
  createAdminProfile,
  getAdminProfile,
  getAdminStats,
  getPendingVerifications,
  loadAdminAudit,
  loadAdminProfiles,
  loadAdminReports,
  loadAdminSession,
  rejectProfile,
  saveAdminSession,
  suspendProfile,
  updateAdminProfile,
  type AdminProfile,
  type AdminSession,
} from "@/lib/admin-store"

export const adminQueryKeys = {
  session: ["admin", "session"] as const,
  stats: ["admin", "stats"] as const,
  profiles: ["admin", "profiles"] as const,
  profile: (id: string) => ["admin", "profiles", id] as const,
  pending: ["admin", "verifications", "pending"] as const,
  reports: ["admin", "reports"] as const,
  audit: ["admin", "audit"] as const,
}

function invalidateAdmin(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ["admin"] })
}

export function useAdminSessionQuery() {
  return useQuery({
    queryKey: adminQueryKeys.session,
    queryFn: async () => loadAdminSession(),
  })
}

export function useAdminLoginMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const session = adminLogin(email, password)
      if (!session) throw new Error("Invalid email or password.")
      return session
    },
    onSuccess: (session) => {
      queryClient.setQueryData(adminQueryKeys.session, session)
      invalidateAdmin(queryClient)
    },
  })
}

export function useAdminLogoutMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      clearAdminSession()
    },
    onSuccess: () => {
      queryClient.setQueryData(adminQueryKeys.session, null)
      queryClient.removeQueries({ queryKey: ["admin"] })
    },
  })
}

export function useAdminStatsQuery() {
  return useQuery({
    queryKey: adminQueryKeys.stats,
    queryFn: async () => getAdminStats(),
    enabled: typeof window !== "undefined",
  })
}

export function useAdminProfilesQuery() {
  return useQuery({
    queryKey: adminQueryKeys.profiles,
    queryFn: async () => loadAdminProfiles(),
  })
}

export function useAdminProfileQuery(id: string) {
  return useQuery({
    queryKey: adminQueryKeys.profile(id),
    queryFn: async () => getAdminProfile(id),
    enabled: Boolean(id),
  })
}

export function usePendingVerificationsQuery() {
  return useQuery({
    queryKey: adminQueryKeys.pending,
    queryFn: async () => getPendingVerifications(),
  })
}

export function useAdminReportsQuery() {
  return useQuery({
    queryKey: adminQueryKeys.reports,
    queryFn: async () => loadAdminReports(),
  })
}

export function useAdminAuditQuery() {
  return useQuery({
    queryKey: adminQueryKeys.audit,
    queryFn: async () => loadAdminAudit(),
  })
}

export function useApproveProfileMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ profileId, staff }: { profileId: string; staff: AdminSession }) =>
      approveProfile(profileId, staff),
    onSuccess: () => invalidateAdmin(queryClient),
  })
}

export function useRejectProfileMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      profileId,
      staff,
      rejectionReason,
    }: {
      profileId: string
      staff: AdminSession
      rejectionReason: string
    }) => rejectProfile(profileId, staff, rejectionReason),
    onSuccess: () => invalidateAdmin(queryClient),
  })
}

export function useSuspendProfileMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ profileId, staff }: { profileId: string; staff: AdminSession }) =>
      suspendProfile(profileId, staff),
    onSuccess: () => invalidateAdmin(queryClient),
  })
}

export function useCreateAdminProfileMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      input,
      staff,
    }: {
      input: Omit<AdminProfile, "id" | "completeness" | "submittedAt"> & { markVerified?: boolean }
      staff: AdminSession
    }) => createAdminProfile(input, staff),
    onSuccess: () => invalidateAdmin(queryClient),
  })
}

export function useUpdateAdminProfileMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ profileId, patch }: { profileId: string; patch: Partial<AdminProfile> }) =>
      updateAdminProfile(profileId, patch),
    onSuccess: () => invalidateAdmin(queryClient),
  })
}

export function useActionReportMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (reportId: string) => actionReport(reportId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.reports })
    },
  })
}

export function setAdminSessionCache(session: AdminSession | null, queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.setQueryData(adminQueryKeys.session, session)
  if (session) saveAdminSession(session)
}
