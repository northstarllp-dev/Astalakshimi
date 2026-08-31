type UserSettings = any;
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { loadProfile, saveProfile, emptySignupData, DEMO_REJECTION_REASON, type SignupData } from "@/lib/profile-store"
import { apiClient } from "@/lib/api-client"
export const queryKeys = {
  profile: ["profile"] as const,
  matches: ["matches"] as const,
  paid: ["membership", "paid"] as const,
  subscription: ["membership", "subscription"] as const,
  invoices: ["membership", "invoices"] as const,
  notifications: ["activity", "notifications"] as const,
  unread: ["activity", "notifications", "unread"] as const,
  shortlists: ["activity", "shortlists"] as const,
  skipped: ["activity", "skipped"] as const,
  interests: ["activity", "interests"] as const,
  settings: ["activity", "settings"] as const,
  savedSearches: ["activity", "saved-searches"] as const,
  activitySummary: ["activity", "summary"] as const,
  topMatches: ["matches", "top"] as const,
  search: (query: any) => ["search", query] as const,
  chat: (threadId: string) => ["chat", threadId] as const,
  chatThreads: ["chat", "threads"] as const,
  contactUsage: ["contacts", "usage"] as const,
  interestUsage: ["interests", "usage"] as const,
  unlockedContacts: ["contacts", "unlocked"] as const,
}


export function useProfileQuery() {
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: async () => {
      let base = loadProfile() || emptySignupData();
      if (typeof window !== 'undefined' && apiClient.getToken()) {
        try {
          const authMe = await apiClient.auth.getMe();
          base.phone = authMe.user.phone;
          
          if (authMe.hasProfile) {
            const fullProfile = await apiClient.profiles.getMyProfile();
            const mapped = {
              profileFor: fullProfile.profile.profileFor,
              fullName: fullProfile.profile.fullName,
              gender: fullProfile.profile.gender,
              dobYear: fullProfile.profile.dob.split('-')[0],
              dobMonth: fullProfile.profile.dob.split('-')[1],
              dobDay: fullProfile.profile.dob.split('-')[2],
              height: String(fullProfile.profile.heightCm),
              maritalStatus: fullProfile.profile.maritalStatus,
              hasChildren: fullProfile.profile.hasChildren ?? false,
              childrenCount: fullProfile.profile.childrenCount ?? 0,
              childrenLivingWithMe: fullProfile.profile.childrenLivingWithMe ?? false,
              religion: fullProfile.profile.religion,
              caste: fullProfile.profile.caste,
              subcaste: fullProfile.profile.subcaste ?? '',
              gotra: fullProfile.profile.gotra ?? '',
              motherTongue: fullProfile.profile.motherTongue,
              educationLevel: fullProfile.profile.educationLevel ?? '',
              education: fullProfile.profile.degree || "",
              degree: fullProfile.profile.degree ?? '',
              collegeName: fullProfile.profile.collegeName ?? '',
              employmentStatus: fullProfile.profile.employmentStatus ?? '',
              occupation: fullProfile.profile.profession || "",
              profession: fullProfile.profile.profession ?? '',
              companyName: fullProfile.profile.companyName ?? '',
              companySector: fullProfile.profile.companySector ?? '',
              annualIncome: fullProfile.profile.annualIncome ?? '',
              photoPrivacy: fullProfile.profile.photoPrivacy,
              city: fullProfile.profile.city,
              state: fullProfile.profile.state,
              aboutMe: fullProfile.profile.aboutMe ?? '',
              familyValues: fullProfile.family?.familyValues ?? 'Moderate',
              familyType: fullProfile.family?.familyType ?? 'Nuclear',
              fatherOccupation: fullProfile.family?.fatherOccupation ?? 'Employed',
              motherOccupation: fullProfile.family?.motherOccupation ?? 'Homemaker',
              brothersCount: fullProfile.family?.brothersCount ?? 0,
              sistersCount: fullProfile.family?.sistersCount ?? 0,
              diet: fullProfile.lifestyle?.diet ?? 'Vegetarian',
              birthTime: fullProfile.horoscope?.birthTime ?? '',
              birthPlace: fullProfile.horoscope?.birthPlace ?? '',
              manglik: fullProfile.horoscope?.manglik ?? "Don't Know",
              rashi: fullProfile.horoscope?.rashi ?? '',
              star: fullProfile.horoscope?.nakshatra ?? '',
              horoscopeName: fullProfile.horoscope?.horoscopeFileName ?? '',
              horoscopeS3Key: fullProfile.horoscope?.horoscopeS3Key ?? '',
              horoscopeSize: fullProfile.horoscope?.horoscopeFileSizeBytes ?? 0,
              photos: fullProfile.photos.map((p: any) => p.url || p.s3Key),
              photoS3Keys: fullProfile.photos.map((p: any) => p.s3Key),
              photoObjects: fullProfile.photos,
              verificationStatus: fullProfile.verificationStatus as any,
            };
            base = { ...base, ...mapped };
          }
          saveProfile(base);
        } catch (e) {
          console.warn("Failed to fetch profile from server, falling back to local storage", e);
        }
      }
      return base;
    },
  })
}

export function useSaveProfileMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: SignupData) => {
      // 1. Save to client-side storage for local state caching
      saveProfile(data)

      // 2. Prepare payload for NestJS complete registration endpoint
      const payload = {
        phone: data.phone,
        otp: data.otp || '123456',
        consentAccepted: data.consentAccepted ?? true,
        referredBy: data.referredBy,
        profileFor: data.profileFor || 'Myself',
        fullName: data.fullName,
        gender: (data.gender as any) || 'Female',
        dobDay: data.dobDay || '01',
        dobMonth: data.dobMonth || '01',
        dobYear: data.dobYear || '1998',
        maritalStatus: (data.maritalStatus as any) || 'Never Married',
        hasChildren: data.hasChildren,
        childrenCount: data.childrenCount,
        childrenLivingWithMe: data.childrenLivingWithMe,
        heightCm: parseInt(data.height || '165', 10),
        aboutMe: data.aboutMe,
        city: data.city || 'Chennai',
        state: data.state || 'Tamil Nadu',
        country: 'India',
        religion: data.religion || 'Hindu',
        caste: data.caste || 'Brahmin',
        subcaste: data.subcaste,
        gotra: data.gotra,
        motherTongue: data.motherTongue || 'Tamil',
        educationLevel: (data.educationLevel as any) || 'Bachelors',
        degree: data.degree || data.education || 'B.Tech',
        collegeName: data.collegeName,
        employmentStatus: (data.employmentStatus as any) || 'Employed',
        profession: data.profession || data.occupation || 'Software Engineer',
        companyName: data.companyName,
        companySector: (data.companySector as any) || 'Private',
        annualIncome: data.annualIncome || '₹10 – 15 Lakh',
        familyValues: (data.familyValues as any) || 'Moderate',
        familyType: (data.familyType as any) || 'Nuclear',
        fatherOccupation: (data.fatherOccupation as any) || 'Employed',
        motherOccupation: (data.motherOccupation as any) || 'Homemaker',
        brothersCount: data.brothersCount || 0,
        sistersCount: data.sistersCount || 0,
        diet: (data.diet as any) || 'Vegetarian',
        birthTime: data.birthTime,
        birthPlace: data.birthPlace,
        manglik: (data.manglik as any) || "Don't Know",
        rashi: data.rashi,
        nakshatra: data.star,
        prefAgeMin: data.prefAgeMin || 24,
        prefAgeMax: data.prefAgeMax || 32,
        prefReligions: data.prefReligion || ['Hindu'],
        photoS3Keys: data.photoS3Keys || [],
        photoPrivacy: (data.photoPrivacy as any) || 'blurred',
        verificationMethod: (data.verificationMethod as any) || 'selfie',
        selfieS3Key:
          data.verificationMethod === 'selfie'
            ? data.selfieS3Key || (data.selfiePhoto ? `verifications/${Date.now()}_selfie.jpg` : undefined)
            : undefined,
        govtIdType:
          data.verificationMethod === 'govt_id' && data.govtIdType && data.govtIdType.trim() !== ''
            ? (data.govtIdType as any)
            : undefined,
        govtIdS3Key:
          data.verificationMethod === 'govt_id'
            ? data.govtIdS3Key || (data.govtIdPhoto ? `verifications/${Date.now()}_govt_id.jpg` : undefined)
            : undefined,
        horoscopeS3Key: data.horoscopeS3Key || undefined,
        horoscopeFileName: data.horoscopeName || undefined,
        horoscopeFileSizeBytes: data.horoscopeSize || undefined,
      }

      // 3. Authenticate with backend if token is missing
      if (!apiClient.getToken() && data.phone) {
        try {
          await apiClient.auth.sendOtp({ phone: data.phone, consentAccepted: true })
        } catch {
          // sendOtp might already have pending OTP
        }
        const auth = await apiClient.auth.verifyOtp({
          phone: data.phone,
          otp: data.otp || '123456',
        })
        apiClient.setToken()
      }

      // 4. Submit complete registration transaction to RDS
      if (apiClient.getToken()) {
        await apiClient.profiles.completeRegistration(payload as any)
      }

      return data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.profile, data)
    },
  })
}

function normalizeManglik(value: string | undefined) {
  if (!value) return undefined
  return value === "Don't know" ? "Don't Know" : value
}

function buildProfileUpdatePayload(data: Partial<SignupData>) {
  const payload: Record<string, unknown> = {}
  const skip = new Set([
    "photos",
    "photoS3Keys",
    "photoObjects",
    "star",
    "horoscopeName",
    "horoscopeSize",
    "height",
    "education",
    "otherEducation",
    "occupation",
    "otherOccupation",
    "prefReligion",
    "manglik",
  ])

  for (const [key, value] of Object.entries(data)) {
    if (!skip.has(key)) payload[key] = value
  }

  if (data.height) payload.heightCm = parseInt(data.height, 10)
  if (data.star !== undefined) payload.nakshatra = data.star
  if (data.horoscopeName !== undefined) payload.horoscopeFileName = data.horoscopeName
  if (data.horoscopeSize !== undefined) payload.horoscopeFileSizeBytes = data.horoscopeSize
  if (data.horoscopeS3Key !== undefined) payload.horoscopeS3Key = data.horoscopeS3Key
  if (data.manglik !== undefined) payload.manglik = normalizeManglik(data.manglik)
  if (data.education !== undefined || data.otherEducation !== undefined || data.degree !== undefined) {
    payload.degree = data.otherEducation || data.education || data.degree
  }
  if (data.occupation !== undefined || data.otherOccupation !== undefined || data.profession !== undefined) {
    payload.profession = data.otherOccupation || data.occupation || data.profession
  }
  if (data.prefReligion !== undefined) payload.prefReligions = data.prefReligion

  return payload
}

function mapFullProfileToSignupData(
  base: SignupData,
  fullProfile: Awaited<ReturnType<typeof apiClient.profiles.getMyProfile>>,
): SignupData {
  return {
    ...base,
    profileFor: fullProfile.profile.profileFor,
    fullName: fullProfile.profile.fullName,
    gender: fullProfile.profile.gender,
    dobYear: fullProfile.profile.dob.split("-")[0],
    dobMonth: fullProfile.profile.dob.split("-")[1],
    dobDay: fullProfile.profile.dob.split("-")[2],
    height: String(fullProfile.profile.heightCm),
    maritalStatus: fullProfile.profile.maritalStatus,
    hasChildren: fullProfile.profile.hasChildren ?? false,
    childrenCount: fullProfile.profile.childrenCount ?? 0,
    childrenLivingWithMe: fullProfile.profile.childrenLivingWithMe ?? false,
    religion: fullProfile.profile.religion,
    caste: fullProfile.profile.caste,
    subcaste: fullProfile.profile.subcaste ?? "",
    gotra: fullProfile.profile.gotra ?? "",
    motherTongue: fullProfile.profile.motherTongue,
    educationLevel: fullProfile.profile.educationLevel ?? "",
    education: fullProfile.profile.degree || "",
    degree: fullProfile.profile.degree ?? "",
    collegeName: fullProfile.profile.collegeName ?? "",
    employmentStatus: fullProfile.profile.employmentStatus ?? "",
    occupation: fullProfile.profile.profession || "",
    profession: fullProfile.profile.profession ?? "",
    companyName: fullProfile.profile.companyName ?? "",
    companySector: fullProfile.profile.companySector ?? "Private",
    annualIncome: fullProfile.profile.annualIncome ?? "",
    photoPrivacy: fullProfile.profile.photoPrivacy,
    city: fullProfile.profile.city,
    state: fullProfile.profile.state,
    aboutMe: fullProfile.profile.aboutMe ?? "",
    familyValues: fullProfile.family?.familyValues ?? "Moderate",
    familyType: fullProfile.family?.familyType ?? "Nuclear",
    fatherOccupation: fullProfile.family?.fatherOccupation ?? "Employed",
    motherOccupation: fullProfile.family?.motherOccupation ?? "Homemaker",
    brothersCount: fullProfile.family?.brothersCount ?? 0,
    sistersCount: fullProfile.family?.sistersCount ?? 0,
    diet: fullProfile.lifestyle?.diet ?? "Vegetarian",
    birthTime: fullProfile.horoscope?.birthTime ?? "",
    birthPlace: fullProfile.horoscope?.birthPlace ?? "",
    manglik: fullProfile.horoscope?.manglik ?? "Don't Know",
    rashi: fullProfile.horoscope?.rashi ?? "",
    star: fullProfile.horoscope?.nakshatra ?? "",
    horoscopeName: fullProfile.horoscope?.horoscopeFileName ?? "",
    horoscopeS3Key: fullProfile.horoscope?.horoscopeS3Key ?? "",
    horoscopeSize: fullProfile.horoscope?.horoscopeFileSizeBytes ?? 0,
    photos: fullProfile.photos
      .map((p: { url?: string; s3Key?: string }) => p.url || p.s3Key)
      .filter((url): url is string => Boolean(url)),
    photoS3Keys: fullProfile.photos
      .map((p: { s3Key?: string }) => p.s3Key)
      .filter((key): key is string => Boolean(key)),
    photoObjects: fullProfile.photos,
    verificationStatus: fullProfile.verificationStatus as SignupData["verificationStatus"],
  }
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<SignupData>) => {
      if (!apiClient.getToken()) throw new Error("Not authenticated")

      const payload = buildProfileUpdatePayload(data)
      const fullProfile = await apiClient.profiles.updateMyProfile(payload as any)

      const base = loadProfile() || emptySignupData()
      const mapped = mapFullProfileToSignupData(base, fullProfile)
      saveProfile(mapped)
      return mapped
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.profile, data)
    },
  })
}

export function useAddPhotoMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (s3Key: string) => {
      await apiClient.photos.add(s3Key);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile })
    },
  })
}

export function useDeletePhotoMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (photoId: string) => {
      await apiClient.photos.remove(photoId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile })
    },
  })
}

export function useReorderPhotosMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (photoIds: string[]) => {
      await apiClient.photos.reorder(photoIds);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile })
    },
  })
}

/** Demo: pending → verified (clears rejectionReason). */
export function useMarkVerifiedMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const current = loadProfile()
      if (!current) return null
      const next: SignupData = {
        ...current,
        verificationStatus: "verified",
        rejectionReason: undefined,
      }
      saveProfile(next)
      return next
    },
    onSuccess: (data) => {
      if (data) queryClient.setQueryData(queryKeys.profile, data)
    },
  })
}

/** Demo: pending → rejected with a sample reason. */
export function useRejectVerificationMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const current = loadProfile()
      if (!current) return null
      const next: SignupData = {
        ...current,
        verificationStatus: "rejected",
        rejectionReason: DEMO_REJECTION_REASON,
      }
      saveProfile(next)
      return next
    },
    onSuccess: (data) => {
      if (data) queryClient.setQueryData(queryKeys.profile, data)
    },
  })
}

/** Resubmit selfie/ID after rejection (or first-time verify) → pending. */
export function useResubmitVerificationMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: SignupData) => {
      if (apiClient.getToken()) {
        try {
          await apiClient.media.confirmVerification({
            method: data.verificationMethod as "selfie" | "govt_id",
            selfieS3Key: data.selfieS3Key,
            govtIdType: data.govtIdType,
            govtIdS3Key: data.govtIdS3Key,
          });
        } catch (e) {
          console.error("Failed to resubmit verification to backend:", e)
        }
      }

      const next: SignupData = {
        ...data,
        verificationStatus: "pending",
        rejectionReason: undefined,
        submittedAt: data.submittedAt || new Date().toISOString(),
      }
      saveProfile(next)
      return next
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.profile, data)
    },
  })
}

export function useMatchesQuery() {
  return useQuery({
    queryKey: queryKeys.matches,
    queryFn: async () => ([] as any[]),
    staleTime: Infinity,
  })
}

export function usePaidQuery() {
  return useQuery({
    queryKey: queryKeys.paid,
    queryFn: async () => {
      if (!apiClient.getToken()) return false;
      try {
        const sub = await apiClient.payments.getSubscription();
        return sub && sub.planSlug && sub.planSlug !== 'free';
      } catch {
        return false;
      }
    },
  });
}

export function useSubscriptionQuery() {
  return useQuery({
    queryKey: queryKeys.subscription,
    queryFn: async () => {
      if (!apiClient.getToken()) return null;
      try {
        return await apiClient.payments.getSubscription();
      } catch {
        return null;
      }
    },
  });
}

export function useInvoicesQuery() {
  return useQuery({
    queryKey: queryKeys.invoices,
    queryFn: async () => {
      if (!apiClient.getToken()) return [];
      try {
        return await apiClient.payments.getInvoices();
      } catch {
        return [];
      }
    },
  });
}

export function useNotificationsQuery() {
  return useQuery({
    queryKey: queryKeys.notifications,
    queryFn: async () => {
      if (!apiClient.getToken()) return [];
      return apiClient.notifications.getAll();
    },
  })
}

export function useUnreadCountQuery() {
  return useQuery({
    queryKey: queryKeys.unread,
    queryFn: async () => {
      if (!apiClient.getToken()) return 0;
      const items = await apiClient.notifications.getAll();
      return items.filter((n: any) => n.unread).length;
    },
  })
}

export function useNotificationMutations() {
  const queryClient = useQueryClient()
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.notifications })
    void queryClient.invalidateQueries({ queryKey: queryKeys.unread })
    void queryClient.invalidateQueries({ queryKey: ["activity", "notifications"] })
  }
  return {
    markRead: useMutation({
      mutationFn: async (id: string) => apiClient.notifications.markRead(id),
      onSuccess: invalidate,
    }),
    markAllRead: useMutation({
      mutationFn: async () => apiClient.notifications.markAllRead(),
      onSuccess: invalidate,
    }),
    clearAll: useMutation({
      mutationFn: async () => apiClient.notifications.clearAll(),
      onSuccess: invalidate,
    }),
  }
}

export function useShortlistQuery() {
  return useQuery({
    queryKey: queryKeys.shortlists,
    queryFn: async () => {
      if (!apiClient.getToken()) return [];
      return apiClient.shortlists.getAll();
    },
  })
}

export function useShortlistIdsQuery() {
  return useQuery({
    queryKey: [...queryKeys.shortlists, "ids"],
    queryFn: async () => {
      if (!apiClient.getToken()) return [];
      const res = await apiClient.shortlists.getIds().catch(async () => {
        const all = await apiClient.shortlists.getAll().catch(() => []);
        return all.map((item: any) => typeof item === "string" ? item : item.id || item.profileId);
      });
      return res;
    },
  })
}

export function useSkippedQuery() {
  return useQuery({
    queryKey: queryKeys.skipped,
    queryFn: async () => ([] as string[]),
    staleTime: Infinity,
  })
}

export function useToggleShortlistMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (profileId: string) => {
      const current = (queryClient.getQueryData<any[]>(queryKeys.shortlists) || []);
      const isShortlisted = current.some((item: any) => 
        typeof item === "string" ? item === profileId : (item.id === profileId || item.profileId === profileId)
      );

      if (isShortlisted) {
        await apiClient.shortlists.remove(profileId);
        return current.filter((item: any) => 
          typeof item === "string" ? item !== profileId : (item.id !== profileId && item.profileId !== profileId)
        );
      } else {
        await apiClient.shortlists.add(profileId);
        return [...current, profileId];
      }
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.shortlists, updated)
      void queryClient.invalidateQueries({ queryKey: queryKeys.shortlists })
      void queryClient.invalidateQueries({ queryKey: queryKeys.interests })
      void queryClient.invalidateQueries({ queryKey: ["activity"] })
    },
  })
}

export function useSkipMatchMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (profileId: string) => {
      const current = (queryClient.getQueryData<string[]>(queryKeys.skipped) || []);
      return [...current, profileId];
    },
    onSuccess: (ids) => {
      queryClient.setQueryData(queryKeys.skipped, ids)
    },
  })
}

export function useSendInterestMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: string | { targetProfileId: string; message?: string }) => {
      const profileId = typeof payload === 'string' ? payload : payload.targetProfileId;
      const message = typeof payload === 'object' ? payload.message : undefined;
      return apiClient.interests.sendInterest(profileId, message);
    },
    onMutate: async (payload) => {
      const profileId = typeof payload === 'string' ? payload : payload.targetProfileId;
      await queryClient.cancelQueries({ queryKey: queryKeys.interests });
      const previous = queryClient.getQueryData<any>(queryKeys.interests);
      if (previous) {
        queryClient.setQueryData(queryKeys.interests, {
          ...previous,
          sent: [
            ...(previous.sent || []),
            {
              id: `temp-${Date.now()}`,
              profileId,
              status: 'pending',
              time: 'Just now',
            },
          ],
        });
      }
      return { previous };
    },
    onError: (_err, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.interests, context.previous);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.interests })
      void queryClient.invalidateQueries({ queryKey: queryKeys.interestUsage })
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications })
      void queryClient.invalidateQueries({ queryKey: ["activity"] })
    },
  })
}

export function useAcceptInterestMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (idOrProfileId: string) => {
      return apiClient.interests.accept(idOrProfileId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.interests })
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications })
      void queryClient.invalidateQueries({ queryKey: ["activity"] })
    },
  })
}

export function useDeclineInterestMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (idOrProfileId: string) => {
      return apiClient.interests.decline(idOrProfileId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.interests })
      void queryClient.invalidateQueries({ queryKey: queryKeys.notifications })
      void queryClient.invalidateQueries({ queryKey: ["activity"] })
    },
  })
}

export function useInterestsQuery() {
  return useQuery({
    queryKey: queryKeys.interests,
    queryFn: async () => {
      if (!apiClient.getToken()) {
        return {
          received: ([] as any[]),
          sent: ([] as any[]),
          mutual: ([] as any[]),
          pendingCount: 0,
          shortlisted: ([] as any[]),
          blocked: ([] as any[]),
          notes: ({} as Record<string, string>),
        };
      }
      const summary = await apiClient.interests.getSummary();
      const shortlistItems = await apiClient.shortlists.getAll().catch(() => []);
      return {
        ...summary,
        shortlisted: shortlistItems,
      };
    },
  })
}

export function useInvalidateInterests() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.interests })
    void queryClient.invalidateQueries({ queryKey: queryKeys.shortlists })
    void queryClient.invalidateQueries({ queryKey: ["activity"] })
  }
}


export function useSettingsQuery() {
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: async () => {
      if (!apiClient.getToken()) return {} as any;
      return apiClient.settings.getSettings();
    },
  })
}

export function useSaveSettingsMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (settings: UserSettings) => {
      return apiClient.settings.updateSettings(settings)
    },
    onSuccess: (settings) => {
      queryClient.setQueryData(queryKeys.settings, settings)
    },
  })
}

export function useSavedSearchesQuery() {
  return useQuery({
    queryKey: queryKeys.savedSearches,
    queryFn: async () => ([] as any[]),
  })
}

export function useAddSavedSearchMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (search: any) => ([] as any[]),
    onSuccess: (items) => {
      queryClient.setQueryData(queryKeys.savedSearches, items)
    },
  })
}

export function useTopMatchesQuery() {
  return useQuery({
    queryKey: queryKeys.topMatches,
    queryFn: async () => {
      if (!apiClient.getToken()) return [];
      return apiClient.matches.getTop();
    },
  })
}

export function useActivitySummaryQuery() {
  return useQuery({
    queryKey: queryKeys.activitySummary,
    queryFn: async () => {
      if (!apiClient.getToken()) {
        return {
          viewers: [],
          youViewed: [],
          interestsReceived: [],
          shortlistedYou: [],
        };
      }
      return apiClient.activity.getSummary();
    },
  })
}

export function useSearchQuery(query: any) {
  return useQuery({
    queryKey: queryKeys.search(query),
    queryFn: async () => {
      if (!apiClient.getToken()) return { profiles: [], totalCount: 0 };
      return apiClient.search.searchProfiles(query);
    },
    // Keep previous data when fetching new pages/filters
    placeholderData: (previousData) => previousData,
  })
}

export function useChatThreadsQuery() {
  return useQuery({
    queryKey: queryKeys.chatThreads,
    queryFn: async () => {
      if (!apiClient.getToken()) return [];
      return apiClient.chat.getThreads().catch(() => []);
    },
  })
}

export function useChatMessagesQuery(threadId?: string | null) {
  return useQuery({
    queryKey: threadId ? queryKeys.chat(threadId) : ["chat", "empty"],
    queryFn: async () => {
      if (!apiClient.getToken() || !threadId) return [];
      return apiClient.chat.getMessages(threadId).catch(() => []);
    },
    enabled: !!threadId,
    // Poll every 3 seconds for real-time live message syncing
    refetchInterval: 3000,
  })
}

export function useSendMessageMutation(threadId?: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ text, receiverProfileId }: { text: string; receiverProfileId?: string }) => {
      if (!threadId) throw new Error("No active thread");
      const res = await apiClient.chat.sendMessage(threadId, text, receiverProfileId);
      if (res && res.status === 'BLOCKED') {
        throw new Error(JSON.stringify(res));
      }
      return res;
    },
    onMutate: async ({ text }) => {
      if (!threadId) return;
      await queryClient.cancelQueries({ queryKey: queryKeys.chat(threadId) });
      const previousMessages = queryClient.getQueryData<any[]>(queryKeys.chat(threadId)) || [];
      
      const optimisticMsg = {
        id: "temp-" + Date.now(),
        threadId,
        text,
        senderName: "You",
        isRead: false,
        createdAt: new Date().toISOString(),
        isSelf: true,
      };

      queryClient.setQueryData(queryKeys.chat(threadId), [...previousMessages, optimisticMsg]);
      return { previousMessages };
    },
    onError: (err, variables, context) => {
      if (threadId && context?.previousMessages) {
        queryClient.setQueryData(queryKeys.chat(threadId), context.previousMessages);
      }
      try {
        const errorData = JSON.parse(err.message);
        if (errorData.status === 'BLOCKED') {
          // Trigger the contact paywall modal
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('TRIGGER_CONTACT_PAYWALL', { 
                detail: { targetProfileId: variables.receiverProfileId || threadId } 
              })
            );
          }
        }
      } catch {
        // generic network error
      }
    },
    onSettled: () => {
      if (threadId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.chat(threadId) });
        void queryClient.invalidateQueries({ queryKey: queryKeys.chatThreads });
      }
    },
  })
}

export function useContactUsageQuery() {
  return useQuery({
    queryKey: queryKeys.contactUsage,
    queryFn: () => apiClient.contacts.getUsage(),
    enabled: Boolean(apiClient.getToken()),
  })
}

export function useInterestUsageQuery() {
  return useQuery({
    queryKey: queryKeys.interestUsage,
    queryFn: () => apiClient.interests.getUsage(),
    enabled: Boolean(apiClient.getToken()),
  })
}

export function useUnlockedContactsQuery() {
  return useQuery({
    queryKey: queryKeys.unlockedContacts,
    queryFn: () => apiClient.contacts.listUnlocked(),
    enabled: Boolean(apiClient.getToken()),
  })
}

export function useUnlockContactMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (targetProfileId: string) => apiClient.contacts.unlock(targetProfileId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.contactUsage })
      void queryClient.invalidateQueries({ queryKey: queryKeys.unlockedContacts })
    },
  })
}

export function usePayExtraContactUnlockMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (targetProfileId: string) => {
      const order = await apiClient.contacts.createPaidOrder(targetProfileId)
      const verified = await apiClient.contacts.verifyPaidUnlock({
        targetProfileId,
        razorpayOrderId: order.orderId,
        razorpayPaymentId: `pay_${Date.now()}`,
        razorpaySignature: "demo_signature",
      })
      return { success: verified.success, contactPhone: verified.contactPhone ?? null }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.contactUsage })
      void queryClient.invalidateQueries({ queryKey: queryKeys.unlockedContacts })
    },
  })
}

