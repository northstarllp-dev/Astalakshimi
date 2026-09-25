type UserSettings = any;
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { loadProfile, saveProfile, emptySignupData, DEMO_REJECTION_REASON, formatSiblings, type SignupData } from "@/lib/profile-store"
import { apiClient, isVerificationPendingError } from "@/lib/api-client"
import { formatHeightFromCm, parseHeightToCm, weightToKg, formatWeightFromKg } from "@/lib/input-units"
import { resolveChildrenFields } from "@/lib/identity-fields"
export const queryKeys = {
  profile: ["profile"] as const,
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
  matchesPaginated: (page: number, limit: number) =>
    ["matches", "paginated", page, limit] as const,
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
          base.consentAccepted = authMe.user.consentAccepted === true;
          
          if (authMe.hasProfile) {
            const fullProfile = await apiClient.profiles.getMyProfile();

            const mapped = {
              profileFor: fullProfile.profile.profileFor,
              fullName: fullProfile.profile.fullName,
              gender: fullProfile.profile.gender,
              dobYear: fullProfile.profile.dob.split('-')[0],
              dobMonth: fullProfile.profile.dob.split('-')[1],
              dobDay: fullProfile.profile.dob.split('-')[2],
              height: formatHeightFromCm(fullProfile.profile.heightCm),
              weight: formatWeightFromKg(fullProfile.profile.weightKg),
              complexion: fullProfile.profile.complexion ?? "",
              disability: fullProfile.profile.disability ?? "",
              maritalStatus: fullProfile.profile.maritalStatus,
              hasChildren: fullProfile.profile.hasChildren ?? false,
              childrenCount: fullProfile.profile.childrenCount ?? 0,
              childrenLivingWithMe: fullProfile.profile.childrenLivingWithMe ?? null,
              religion: fullProfile.profile.religion,
              caste: fullProfile.profile.caste,
              communitySlug: fullProfile.profile.communitySlug ?? '',
              subcaste: fullProfile.profile.subcaste ?? '',
              gotra: fullProfile.profile.gotra ?? '',
              motherTongue: fullProfile.profile.motherTongue,
              educationLevel: fullProfile.profile.educationLevel ?? '',
              degree: fullProfile.profile.degree ?? '',
              collegeName: fullProfile.profile.collegeName ?? '',
              employmentStatus: fullProfile.profile.employmentStatus ?? '',
              profession: fullProfile.profile.profession ?? '',
              companyName: fullProfile.profile.companyName ?? '',
              companySector: fullProfile.profile.companySector ?? '',
              annualIncome: fullProfile.profile.annualIncome ?? '',
              photoPrivacy: fullProfile.profile.photoPrivacy,
              city: fullProfile.profile.city,
              state: fullProfile.profile.state,
              citySlug: fullProfile.profile.citySlug ?? '',
              willingToRelocate: fullProfile.profile.willingToRelocate ?? '',
              aboutMe: fullProfile.profile.aboutMe ?? '',
              familyValues: fullProfile.family?.familyValues ?? '',
              familyType: fullProfile.family?.familyType ?? '',
              familyStatus: fullProfile.family?.familyStatus ?? '',
              fatherOccupation: fullProfile.family?.fatherOccupation ?? '',
              motherOccupation: fullProfile.family?.motherOccupation ?? '',
              brothersCount: fullProfile.family?.brothersCount ?? 0,
              sistersCount: fullProfile.family?.sistersCount ?? 0,
              siblings: formatSiblings(
                fullProfile.family?.brothersCount ?? 0,
                fullProfile.family?.sistersCount ?? 0,
              ),
              diet: fullProfile.lifestyle?.diet ?? '',
              smoking: fullProfile.lifestyle?.smoking ?? '',
              alcohol: fullProfile.lifestyle?.alcohol ?? '',
              interests: fullProfile.lifestyle?.interests ?? [],
              birthTime: fullProfile.horoscope?.birthTime ?? '',
              birthPlace: fullProfile.horoscope?.birthPlace ?? '',
              manglik: fullProfile.horoscope?.manglik ?? "Don't Know",
              rashi: fullProfile.horoscope?.rashi ?? '',
              star: fullProfile.horoscope?.nakshatra ?? '',
              horoscopeName: fullProfile.horoscope?.horoscopeFileName ?? '',
              horoscopeS3Key: fullProfile.horoscope?.horoscopeS3Key ?? '',
              horoscopeSize: fullProfile.horoscope?.horoscopeFileSizeBytes ?? 0,
              photos: fullProfile.photos
                .map((p: { url?: string; s3Key?: string }) => p.s3Key || p.url)
                .filter((url): url is string => Boolean(url)),
              photoS3Keys: fullProfile.photos
                .map((p: { s3Key?: string }) => p.s3Key)
                .filter((key): key is string => Boolean(key)),
              photoObjects: fullProfile.photos,
              verificationStatus: fullProfile.verificationStatus as any,
              ...mapVerificationDocs(fullProfile.verification),
              prefAgeMin: fullProfile.preferences?.prefAgeMin ?? undefined,
              prefAgeMax: fullProfile.preferences?.prefAgeMax ?? undefined,
              prefHeightMinCm: fullProfile.preferences?.prefHeightMinCm ?? undefined,
              prefHeightMaxCm: fullProfile.preferences?.prefHeightMaxCm ?? undefined,
              prefReligion: fullProfile.preferences?.prefReligions ?? [],
              prefMaritalStatuses: (fullProfile.preferences as any)?.prefMaritalStatuses ?? [],
              prefCastes: fullProfile.preferences?.prefCastes ?? [],
              prefMotherTongues: fullProfile.preferences?.prefMotherTongues ?? [],
              prefMinEducation: fullProfile.preferences?.prefMinEducation ?? '',
              prefAcceptableIncomes: fullProfile.preferences?.prefAcceptableIncomes ?? [],
              prefLocations: fullProfile.preferences?.prefLocations ?? [],
              submittedAt: base.submittedAt || fullProfile.profile.createdAt || new Date().toISOString(),
            };
            base = { ...base, ...mapped };
          } else {
            // User does not have a profile, reset to prevent showing cached deleted profiles
            base = { ...emptySignupData(), phone: authMe.user.phone };
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
      let next: SignupData = { ...data, verificationStatus: data.verificationStatus || "idle" }
      saveProfile(next)

      const blank = (v?: string | null) => {
        if (v == null) return undefined
        const t = String(v).trim()
        return t === "" ? undefined : t
      }

      // 2. Prepare payload for NestJS complete registration endpoint
      const payload = {
        phone: data.phone,
        otp: data.otp,
        consentAccepted: data.consentAccepted ?? true,
        referredBy: blank(data.referredBy),
        profileFor: blank(data.profileFor),
        fullName: data.fullName,
        gender: blank(data.gender) as any,
        dobDay: blank(data.dobDay),
        dobMonth: blank(data.dobMonth),
        dobYear: blank(data.dobYear),
        maritalStatus: blank(data.maritalStatus) as any,
        ...resolveChildrenFields({
          maritalStatus: data.maritalStatus,
          hasChildren: data.hasChildren,
          childrenCount: data.childrenCount,
          childrenLivingWithMe: data.childrenLivingWithMe,
        }),
        heightCm: parseHeightToCm(data.height),
        aboutMe: blank(data.aboutMe),
        city: blank(data.city) || "Chennai",
        state: blank(data.state) || "Tamil Nadu",
        country: "India",
        citySlug: blank(data.citySlug),
        willingToRelocate: blank(data.willingToRelocate),
        religion: blank(data.religion) || "Hindu",
        caste: blank(data.caste) || "Brahmin",
        communitySlug: blank(data.communitySlug),
        subcaste: blank(data.subcaste),
        gotra: blank(data.gotra),
        motherTongue: blank(data.motherTongue) || "Tamil",
        // Career is post-signup (edit / Discover unlock). Do not invent
        // Bachelors/Employed — leave null so the DB stays honest until filled.
        educationLevel: (blank(data.educationLevel) as any) || undefined,
        degree: blank(data.degree),
        collegeName: blank(data.collegeName),
        employmentStatus: (blank(data.employmentStatus) as any) || undefined,
        profession: blank(data.profession),
        companyName: blank(data.companyName),
        companySector: (blank(data.companySector) as any) || undefined,
        annualIncome: blank(data.annualIncome),
        familyValues: blank(data.familyValues) as any,
        familyType: blank(data.familyType) as any,
        familyStatus: blank(data.familyStatus),
        fatherOccupation: blank(data.fatherOccupation) as any,
        motherOccupation: blank(data.motherOccupation) as any,
        brothersCount: data.brothersCount || 0,
        sistersCount: data.sistersCount || 0,
        // Diet required at registration; smoking/alcohol/interests are
        // collected later via /profile/edit (not sent at signup).
        diet: blank(data.diet) as any,
        birthTime: blank(data.birthTime),
        birthPlace: blank(data.birthPlace),
        manglik: (blank(data.manglik) as any) || "Don't Know",
        rashi: blank(data.rashi),
        nakshatra: blank(data.star),
        // Partner preferences are collected in the signup wizard (step 5) — send
        // the member's real choices rather than fabricated defaults the engine
        // would otherwise match on. Age range + religion are required by the step;
        // the rest stay optional. Marital status keeps a sensible default.
        prefAgeMin: data.prefAgeMin,
        prefAgeMax: data.prefAgeMax,
        prefHeightMinCm: data.prefHeightMinCm,
        prefHeightMaxCm: data.prefHeightMaxCm,
        prefReligions: data.prefReligion || [],
        prefMaritalStatuses: data.prefMaritalStatuses || [],
        prefCastes: data.prefCastes || [],
        prefMotherTongues: data.prefMotherTongues || [],
        prefMinEducation: blank(data.prefMinEducation),
        prefAcceptableIncomes: data.prefAcceptableIncomes || [],
        prefLocations: data.prefLocations || [],
        photoS3Keys: data.photoS3Keys || [],
        photoContentHashes: data.photoContentHashes || [],
        photoPrivacy: (blank(data.photoPrivacy) as any) || "blurred",
        verificationMethod: "selfie",
        selfieS3Key: blank(data.selfieS3Key),
        govtIdType: (blank(data.govtIdType) as any) || undefined,
        govtIdS3Key: blank(data.govtIdS3Key),
        horoscopeS3Key: blank(data.horoscopeS3Key),
        horoscopeFileName: blank(data.horoscopeName),
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
          otp: data.otp,
        })
        apiClient.setToken()
      }

      // 4. Complete registration and auto-submit verification since we removed the manual submit button.
      if (apiClient.getToken()) {
        await apiClient.profiles.completeRegistration(payload as any)
        
        // Auto-submit verification (promotes from idle -> pending)
        try {
          await apiClient.profiles.submitVerification()
        } catch (err) {
          console.warn("Failed to auto-submit verification:", err)
        }

        await apiClient.auth.syncEnrollment()
        // Refetch the server profile so React Query / sessionStorage store S3
        // keys — not blob: previews from the signup form (those break avatars
        // until a hard reload).
        try {
          const fullProfile = await apiClient.profiles.getMyProfile()
          next = mapFullProfileToSignupData(
            { ...next, verificationStatus: "pending", phone: data.phone },
            fullProfile,
          )
        } catch {
          next = { ...next, verificationStatus: "pending" }
        }
        saveProfile(next)
      }

      return next
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.profile, data)
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile })
    },
  })
}

function normalizeManglik(value: string | undefined) {
  if (!value) return undefined
  return value === "Don't know" ? "Don't Know" : value
}

const UPDATE_PAYLOAD_KEYS = new Set([
  "profileFor",
  "fullName",
  "gender",
  "dobDay",
  "dobMonth",
  "dobYear",
  "maritalStatus",
  "hasChildren",
  "childrenCount",
  "childrenLivingWithMe",
  "heightCm",
  "aboutMe",
  "weightKg",
  "complexion",
  "disability",
  "city",
  "state",
  "country",
  "citySlug",
  "willingToRelocate",
  "religion",
  "caste",
  "communitySlug",
  "subcaste",
  "gotra",
  "motherTongue",
  "educationLevel",
  "degree",
  "collegeName",
  "employmentStatus",
  "profession",
  "companyName",
  "companySector",
  "annualIncome",
  "photoPrivacy",
  "diet",
  "smoking",
  "alcohol",
  "interests",
  "familyValues",
  "familyType",
  "familyStatus",
  "fatherOccupation",
  "motherOccupation",
  "brothersCount",
  "sistersCount",
  "birthTime",
  "birthPlace",
  "manglik",
  "rashi",
  "nakshatra",
  "horoscopeS3Key",
  "horoscopeFileName",
  "horoscopeFileSizeBytes",
  "prefAgeMin",
  "prefAgeMax",
  "prefHeightMinCm",
  "prefHeightMaxCm",
  "prefMaritalStatuses",
  "prefReligions",
  "prefCastes",
  "prefMotherTongues",
  "prefMinEducation",
  "prefAcceptableIncomes",
  "prefLocations",
])

function blankToUndef(v: unknown) {
  if (v == null) return undefined
  if (typeof v === "string" && v.trim() === "") return undefined
  return v
}

function buildProfileUpdatePayload(data: Partial<SignupData>) {
  const payload: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(data)) {
    if (!UPDATE_PAYLOAD_KEYS.has(key)) continue
    payload[key] = blankToUndef(value)
  }

  if (data.height) {
    const heightCm = parseHeightToCm(data.height)
    if (heightCm) payload.heightCm = heightCm
  }
  if (data.weight !== undefined) payload.weightKg = weightToKg(data.weight)
  if (data.complexion !== undefined) payload.complexion = blankToUndef(data.complexion) ?? null
  if (data.disability !== undefined) payload.disability = blankToUndef(data.disability) ?? null
  if (data.subcaste !== undefined) payload.subcaste = blankToUndef(data.subcaste) ?? null
  if (data.gotra !== undefined) payload.gotra = blankToUndef(data.gotra) ?? null
  if (
    data.maritalStatus !== undefined ||
    data.hasChildren !== undefined ||
    data.childrenCount !== undefined ||
    data.childrenLivingWithMe !== undefined
  ) {
    const children = resolveChildrenFields({
      maritalStatus: data.maritalStatus,
      hasChildren: data.hasChildren,
      childrenCount: data.childrenCount,
      childrenLivingWithMe: data.childrenLivingWithMe,
    })
    payload.hasChildren = children.hasChildren
    payload.childrenCount = children.childrenCount
    payload.childrenLivingWithMe = children.childrenLivingWithMe
  }
  // Horoscope: UI `star` → API `nakshatra`; blank → null so PATCH can clear.
  if (data.birthTime !== undefined) payload.birthTime = blankToUndef(data.birthTime) ?? null
  if (data.birthPlace !== undefined) payload.birthPlace = blankToUndef(data.birthPlace) ?? null
  if (data.rashi !== undefined) payload.rashi = blankToUndef(data.rashi) ?? null
  if (data.star !== undefined) payload.nakshatra = blankToUndef(data.star) ?? null
  if (data.horoscopeName !== undefined) payload.horoscopeFileName = blankToUndef(data.horoscopeName) ?? null
  if (data.horoscopeSize !== undefined) payload.horoscopeFileSizeBytes = data.horoscopeSize || null
  if (data.horoscopeS3Key !== undefined) payload.horoscopeS3Key = blankToUndef(data.horoscopeS3Key) ?? null
  if (data.manglik !== undefined) payload.manglik = normalizeManglik(data.manglik)
  // Lifestyle enums: blank → null so PATCH clears them to NULL (nullable columns).
  if (data.diet !== undefined) payload.diet = blankToUndef(data.diet) ?? null
  if (data.smoking !== undefined) payload.smoking = blankToUndef(data.smoking) ?? null
  if (data.alcohol !== undefined) payload.alcohol = blankToUndef(data.alcohol) ?? null
  // Free-text career fields: blank → null so PATCH can clear them in Postgres.
  if (data.degree !== undefined) payload.degree = blankToUndef(data.degree) ?? null
  if (data.collegeName !== undefined) payload.collegeName = blankToUndef(data.collegeName) ?? null
  if (data.profession !== undefined) payload.profession = blankToUndef(data.profession) ?? null
  if (data.companyName !== undefined) payload.companyName = blankToUndef(data.companyName) ?? null
  if (data.annualIncome !== undefined) payload.annualIncome = blankToUndef(data.annualIncome) ?? null
  // Enum career fields: blank → null so "Others" / cleared selects actually clear the DB.
  if (data.educationLevel !== undefined) payload.educationLevel = blankToUndef(data.educationLevel) ?? null
  if (data.employmentStatus !== undefined) payload.employmentStatus = blankToUndef(data.employmentStatus) ?? null
  if (data.companySector !== undefined) payload.companySector = blankToUndef(data.companySector) ?? null
  // Family fields: blank enum/text → null so PATCH can clear them.
  if (data.familyStatus !== undefined) payload.familyStatus = blankToUndef(data.familyStatus) ?? null
  if (data.familyValues !== undefined) payload.familyValues = blankToUndef(data.familyValues) ?? null
  if (data.familyType !== undefined) payload.familyType = blankToUndef(data.familyType) ?? null
  if (data.fatherOccupation !== undefined) payload.fatherOccupation = blankToUndef(data.fatherOccupation) ?? null
  if (data.motherOccupation !== undefined) payload.motherOccupation = blankToUndef(data.motherOccupation) ?? null
  if (data.prefReligion !== undefined) payload.prefReligions = data.prefReligion
  if (data.prefAgeMin !== undefined) payload.prefAgeMin = data.prefAgeMin
  if (data.prefAgeMax !== undefined) payload.prefAgeMax = data.prefAgeMax
  if (data.prefHeightMinCm !== undefined) payload.prefHeightMinCm = data.prefHeightMinCm
  if (data.prefHeightMaxCm !== undefined) payload.prefHeightMaxCm = data.prefHeightMaxCm
  if (data.prefCastes !== undefined) payload.prefCastes = data.prefCastes
  if (data.prefMotherTongues !== undefined) payload.prefMotherTongues = data.prefMotherTongues
  if (data.prefMinEducation !== undefined) payload.prefMinEducation = blankToUndef(data.prefMinEducation)
  if (data.prefAcceptableIncomes !== undefined) payload.prefAcceptableIncomes = data.prefAcceptableIncomes
  if (data.prefLocations !== undefined) payload.prefLocations = data.prefLocations

  // Drop keys that became undefined after blank normalization (except explicit null FKs).
  for (const key of Object.keys(payload)) {
    if (payload[key] === undefined) delete payload[key]
  }

  return payload
}

function mapVerificationDocs(verification: {
  selfieS3Key?: string | null
  govtIdS3Key?: string | null
  govtIdType?: string | null
  method?: SignupData["verificationMethod"] | null
  rejectionReason?: string | null
} | null | undefined) {
  const selfie = verification?.selfieS3Key || ""
  const govtId = verification?.govtIdS3Key || ""
  return {
    selfieS3Key: selfie,
    selfiePhoto: selfie,
    govtIdS3Key: govtId,
    govtIdPhoto: govtId,
    govtIdType: verification?.govtIdType || "",
    verificationMethod: (verification?.method || "") as SignupData["verificationMethod"],
    rejectionReason: verification?.rejectionReason || undefined,
  }
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
    height: formatHeightFromCm(fullProfile.profile.heightCm),
    weight: formatWeightFromKg(fullProfile.profile.weightKg),
    complexion: fullProfile.profile.complexion ?? "",
    disability: fullProfile.profile.disability ?? "",
    maritalStatus: fullProfile.profile.maritalStatus,
    hasChildren: fullProfile.profile.hasChildren ?? false,
    childrenCount: fullProfile.profile.childrenCount ?? 0,
    childrenLivingWithMe: fullProfile.profile.childrenLivingWithMe ?? null,
    religion: fullProfile.profile.religion,
    caste: fullProfile.profile.caste,
    communitySlug: fullProfile.profile.communitySlug ?? "",
    subcaste: fullProfile.profile.subcaste ?? "",
    gotra: fullProfile.profile.gotra ?? "",
    motherTongue: fullProfile.profile.motherTongue,
    educationLevel: fullProfile.profile.educationLevel ?? "",
    degree: fullProfile.profile.degree ?? "",
    collegeName: fullProfile.profile.collegeName ?? "",
    employmentStatus: fullProfile.profile.employmentStatus ?? "",
    profession: fullProfile.profile.profession ?? "",
    companyName: fullProfile.profile.companyName ?? "",
    companySector: fullProfile.profile.companySector ?? "",
    annualIncome: fullProfile.profile.annualIncome ?? "",
    photoPrivacy: fullProfile.profile.photoPrivacy,
    city: fullProfile.profile.city,
    state: fullProfile.profile.state,
    citySlug: fullProfile.profile.citySlug ?? "",
    willingToRelocate: fullProfile.profile.willingToRelocate ?? "",
    aboutMe: fullProfile.profile.aboutMe ?? "",
    familyValues: fullProfile.family?.familyValues ?? "",
    familyType: fullProfile.family?.familyType ?? "",
    familyStatus: fullProfile.family?.familyStatus ?? "",
    fatherOccupation: fullProfile.family?.fatherOccupation ?? "",
    motherOccupation: fullProfile.family?.motherOccupation ?? "",
    brothersCount: fullProfile.family?.brothersCount ?? 0,
    sistersCount: fullProfile.family?.sistersCount ?? 0,
    siblings: formatSiblings(
      fullProfile.family?.brothersCount ?? 0,
      fullProfile.family?.sistersCount ?? 0,
    ),
    diet: fullProfile.lifestyle?.diet ?? "",
    smoking: fullProfile.lifestyle?.smoking ?? "",
    alcohol: fullProfile.lifestyle?.alcohol ?? "",
    interests: fullProfile.lifestyle?.interests ?? [],
    birthTime: fullProfile.horoscope?.birthTime ?? "",
    birthPlace: fullProfile.horoscope?.birthPlace ?? "",
    manglik: fullProfile.horoscope?.manglik ?? "Don't Know",
    rashi: fullProfile.horoscope?.rashi ?? "",
    star: fullProfile.horoscope?.nakshatra ?? "",
    horoscopeName: fullProfile.horoscope?.horoscopeFileName ?? "",
    horoscopeS3Key: fullProfile.horoscope?.horoscopeS3Key ?? "",
    horoscopeSize: fullProfile.horoscope?.horoscopeFileSizeBytes ?? 0,
    prefAgeMin: fullProfile.preferences?.prefAgeMin ?? base.prefAgeMin,
    prefAgeMax: fullProfile.preferences?.prefAgeMax ?? base.prefAgeMax,
    prefHeightMinCm: fullProfile.preferences?.prefHeightMinCm ?? base.prefHeightMinCm,
    prefHeightMaxCm: fullProfile.preferences?.prefHeightMaxCm ?? base.prefHeightMaxCm,
    prefReligion: fullProfile.preferences?.prefReligions ?? base.prefReligion,
    prefMaritalStatuses: (fullProfile.preferences as any)?.prefMaritalStatuses ?? base.prefMaritalStatuses,
    prefCastes: fullProfile.preferences?.prefCastes ?? base.prefCastes,
    prefMotherTongues: fullProfile.preferences?.prefMotherTongues ?? base.prefMotherTongues,
    prefMinEducation: fullProfile.preferences?.prefMinEducation ?? base.prefMinEducation,
    prefAcceptableIncomes: fullProfile.preferences?.prefAcceptableIncomes ?? base.prefAcceptableIncomes,
    prefLocations: fullProfile.preferences?.prefLocations ?? base.prefLocations,
    photos: fullProfile.photos
      .map((p: { url?: string; s3Key?: string }) => p.s3Key || p.url)
      .filter((url): url is string => Boolean(url)),
    photoS3Keys: fullProfile.photos
      .map((p: { s3Key?: string }) => p.s3Key)
      .filter((key): key is string => Boolean(key)),
    photoObjects: fullProfile.photos,
    verificationStatus: fullProfile.verificationStatus as SignupData["verificationStatus"],
    ...mapVerificationDocs(fullProfile.verification),
    // Treat any saved profile as submitted so signup-default selects count as filled.
    submittedAt: base.submittedAt || fullProfile.profile.createdAt || new Date().toISOString(),
  }
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: Partial<SignupData>) => {
      const payload = buildProfileUpdatePayload(data)
      if (Object.keys(payload).length === 0) {
        throw new Error("No changes to save.")
      }

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
    mutationFn: async ({ s3Key, contentHash }: { s3Key: string; contentHash?: string }) => {
      const fullProfile = await apiClient.photos.add(s3Key, contentHash)
      const base = loadProfile() || emptySignupData()
      const mapped = mapFullProfileToSignupData(base, fullProfile)
      saveProfile(mapped)
      return mapped
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.profile, data)
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile })
    },
  })
}

export function useDeletePhotoMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (photoId: string) => {
      const fullProfile = await apiClient.photos.remove(photoId)
      const base = loadProfile() || emptySignupData()
      const mapped = mapFullProfileToSignupData(base, fullProfile)
      saveProfile(mapped)
      return mapped
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.profile, data)
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile })
    },
  })
}

export function useReorderPhotosMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (photoIds: string[]) => {
      const fullProfile = await apiClient.photos.reorder(photoIds)
      const base = loadProfile() || emptySignupData()
      const mapped = mapFullProfileToSignupData(base, fullProfile)
      saveProfile(mapped)
      return mapped
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.profile, data)
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

/** Promote idle/rejected verification → pending for admin review. */
export function useSubmitVerificationMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const res = await apiClient.profiles.submitVerification()
      return res
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile })
    },
  })
}

/** Resubmit selfie/ID after rejection (or first-time verify) → pending. */
export function useResubmitVerificationMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: SignupData) => {
      if (!apiClient.getToken()) {
        throw new Error("Please sign in again to submit verification.")
      }

      const hasDocs = Boolean(data.selfieS3Key && data.govtIdS3Key && data.govtIdType)

      if (hasDocs) {
        await apiClient.media.confirmVerification({
          method: "selfie",
          selfieS3Key: data.selfieS3Key,
          govtIdType: data.govtIdType,
          govtIdS3Key: data.govtIdS3Key,
        })
      } else {
        // Docs already on the server from registration — just promote idle → pending.
        await apiClient.profiles.submitVerification()
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
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile })
    },
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
    onError: (err, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.interests, context.previous);
      }
      // Pending verification is gated in the UI; if a call still lands, don't
      // escalate beyond the mutation error state (avoids noisy overlays).
      if (isVerificationPendingError(err)) return
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

/** Paginated, score-ranked matches for the Discover "Your Top Matches" tab. */
export function useTopMatchesPaginatedQuery(params: { page: number; limit: number }) {
  return useQuery({
    queryKey: queryKeys.matchesPaginated(params.page, params.limit),
    queryFn: async () => {
      if (!apiClient.getToken()) return { matches: [], totalCount: 0 };
      return apiClient.matches.getPaginated(params);
    },
    // Keep the previous page visible while the next one loads.
    placeholderData: (previousData) => previousData,
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
      const { openRazorpayCheckout } = await import("@/lib/razorpay")
      const paid = await openRazorpayCheckout({
        keyId: order.keyId,
        orderId: order.orderId,
        amount: order.amount,
        currency: order.currency,
        description: "Extra contact unlock",
      })
      const verified = await apiClient.contacts.verifyPaidUnlock({
        targetProfileId,
        ...paid,
      })
      return { success: verified.success, contactPhone: verified.contactPhone ?? null }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.contactUsage })
      void queryClient.invalidateQueries({ queryKey: queryKeys.unlockedContacts })
    },
  })
}

