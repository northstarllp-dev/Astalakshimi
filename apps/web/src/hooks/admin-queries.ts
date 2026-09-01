import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import imageCompression from "browser-image-compression"
import {
  actionReport,
  adminLogin,
  approveProfile,
  clearAdminSession,
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
  isSlaBreached,
  type AdminProfile,
  type AdminSession,
} from "@/lib/admin-store"
import { apiClient } from "@/lib/api-client"
import { IMAGES } from "@/lib/images"
import { getMediaUrl } from "@/lib/utils"

export const adminQueryKeys = {
  session: ["admin", "session"] as const,
  stats: ["admin", "stats"] as const,
  profiles: ["admin", "profiles"] as const,
  profile: (id: string) => ["admin", "profiles", id] as const,
  pending: ["admin", "verifications", "pending"] as const,
  reports: ["admin", "reports"] as const,
  audit: ["admin", "audit"] as const,
}

/** Admin UI works offline with mock data; skip noisy errors when Nest/API is down. */
async function tryAdminApi<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn()
  } catch {
    return null
  }
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
    queryFn: async () => {
      const mockStats = await getAdminStats()
      const actualStats = await tryAdminApi(() => apiClient.admin.getStats())
      if (!actualStats) return mockStats
      return {
        ...mockStats,
        totalUsers: actualStats.totalUsers,
        totalProfiles: actualStats.totalProfiles,
        activeSubscriptions: actualStats.activeSubscriptions,
        pendingVerifications: actualStats.pendingVerifications,
      }
    },
    enabled: typeof window !== "undefined",
  })
}

export function useAdminProfilesQuery() {
  return useQuery({
    queryKey: adminQueryKeys.profiles,
    queryFn: async () => {
      try {
        const actualProfiles = await apiClient.admin.getAllProfiles()
        return actualProfiles.map((p: any) => ({
          ...p,
          id: p.id,
          fullName: p.fullName || "Unknown",
          city: p.city || "Unknown",
          phone: p.phone || "Unknown",
          gender: p.gender || "Female",
          verificationStatus: p.verificationStatus || "idle",
          completeness: p.completeness ?? 0,
          accountStatus: p.accountStatus || "active",
          createdBy: p.createdBy || "self",
          submittedAt: p.submittedAt,
          photos: p.photos
            ? p.photos.map((ph: any) => ({
                ...ph,
                url: getMediaUrl(ph.s3Key),
              }))
            : [],
        }))
      } catch (err) {
        console.error("Failed to fetch admin profiles from backend, falling back to mock:", err)
        return loadAdminProfiles()
      }
    },
  })
}

export function useAdminProfileQuery(id: string) {
  return useQuery({
    queryKey: adminQueryKeys.profile(id),
    queryFn: async () => {
      if (id.startsWith("adm-")) return getAdminProfile(id)
      const p = await tryAdminApi(() => apiClient.admin.getProfile(id))
      if (!p) return null
      return {
        ...p,
        selfiePhoto: getMediaUrl(p.selfieS3Key),
        govtIdPhoto: getMediaUrl(p.govtIdS3Key),
        photos: p.photos ? p.photos.map((ph: any) => ({
          ...ph,
          url: getMediaUrl(ph.s3Key),
        })) : [],
      }
    },
    enabled: Boolean(id),
  })
}

export function usePendingVerificationsQuery() {
  return useQuery({
    queryKey: adminQueryKeys.pending,
    queryFn: async () => {
      const actualPending = await tryAdminApi(() => apiClient.admin.getPendingVerifications())
      if (!actualPending) return getPendingVerifications()
      return actualPending.map((p) => ({
          id: `ver-${p.id}`,
          profileId: p.profileId,
          fullName: p.fullName || "Unknown",
          city: p.city || "Unknown",
          phone: p.phone || "Unknown",
          method: p.method as "selfie" | "govt_id",
          govtIdType: p.govtIdType || undefined,
          hasHoroscope: false,
          submittedAt: p.submittedAt,
          slaBreached: isSlaBreached(p.submittedAt),
          primaryPhoto: getMediaUrl(p.selfieS3Key || p.govtIdS3Key || IMAGES.profiles.priya[0]),
      }))
    },
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
    mutationFn: async ({ profileId, staff }: { profileId: string; staff: AdminSession }) => {
      await tryAdminApi(() => apiClient.admin.updateVerificationStatus(profileId, 'verified'))
      return approveProfile(profileId, staff)
    },
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
    }) => {
      await tryAdminApi(() => apiClient.admin.updateVerificationStatus(profileId, 'rejected', rejectionReason))
      return rejectProfile(profileId, staff, rejectionReason)
    },
    onSuccess: () => invalidateAdmin(queryClient),
  })
}

export function useDeleteProfileMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ profileId, staff }: { profileId: string; staff: AdminSession }) => {
      try {
        await apiClient.admin.deleteProfile(profileId)
      } catch (err) {
        console.error("Backend delete failed, proceeding with mock delete:", err)
      }
      return suspendProfile(profileId, staff)
    },
    onSuccess: () => invalidateAdmin(queryClient),
  })
}

export function useCreateAdminProfileMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      input,
      photos,
    }: {
      input: {
        profileFor: string
        phone: string
        fullName: string
        gender: "Male" | "Female" | "Other"
        dobDay: string
        dobMonth: string
        dobYear: string
        maritalStatus: "Never Married" | "Divorced" | "Widowed" | "Awaiting Divorce"
        city: string
        religion: string
        caste: string
        motherTongue: string
        brothersCount: number
        sistersCount: number
        planId?: string
      }
      photos: File[]
    }) => {
      const profile = await apiClient.admin.createProfile(input)
      if (photos.length === 0) return profile

      const s3Keys: string[] = []
      for (let file of photos) {
        try {
          const options = {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true,
          }
          file = await imageCompression(file, options) as File
        } catch (err) {
          console.error("Image compression error:", err)
        }
        const formData = new FormData()
        formData.append("file", file)
        const { s3Key } = await apiClient.admin.uploadPhoto(profile.id, formData)
        s3Keys.push(s3Key)
      }
      return apiClient.admin.attachPhotos(profile.id, s3Keys)
    },
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
