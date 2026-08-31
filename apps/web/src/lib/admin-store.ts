import { IMAGES } from "@/lib/images"
import { VERIFICATION_SLA_HOURS } from "@/lib/profile-store"

export const ADMIN_SESSION_KEY = "astalakshimi.admin.session"
export const ADMIN_PROFILES_KEY = "astalakshimi.admin.profiles"
export const ADMIN_REPORTS_KEY = "astalakshimi.admin.reports"
export const ADMIN_AUDIT_KEY = "astalakshimi.admin.audit"

export const DEMO_ADMIN_EMAIL = "admin@astalakshimi.in"
export const DEMO_ADMIN_PASSWORD = "AstaAdmin@2026"

export type AdminRole = "admin" | "moderator"
export type AccountStatus = "active" | "suspended"
export type AdminVerificationStatus = "idle" | "pending" | "verified" | "rejected"
export type PhotoReviewStatus = "pending" | "approved" | "rejected"
export type ReportStatus = "new" | "actioned"
export type ReportCategory = "inappropriate_photo" | "fake_id" | "harassment" | "spam"
export type CreatedBy = "self" | "staff"

export type AdminSession = {
  staffId: string
  email: string
  name: string
  role: AdminRole
  loggedInAt: string
}

export type AdminProfilePhoto = {
  id: string
  url: string
  status: PhotoReviewStatus
  isPrimary: boolean
}

export type AdminProfile = {
  id: string
  phone: string
  profileFor: string
  fullName: string
  gender: string
  city: string
  state: string
  religion: string
  caste: string
  motherTongue: string
  dobDay: string
  dobMonth: string
  dobYear: string
  maritalStatus: string
  brothersCount: number
  sistersCount: number
  aboutMe: string
  verificationMethod: "selfie" | "govt_id" | ""
  verificationStatus: AdminVerificationStatus
  rejectionReason?: string
  selfiePhoto: string
  govtIdType: string
  govtIdPhoto: string
  horoscopeName: string
  birthTime: string
  birthPlace: string
  rashi: string
  star: string
  manglik: string
  photos: AdminProfilePhoto[]
  completeness: number
  createdBy: CreatedBy
  createdByStaff?: string
  accountStatus: AccountStatus
  submittedAt: string
  reviewedAt?: string
  reviewedBy?: string
  activeSubscription: boolean
}

export type AdminStats = {
  totalUsers: number
  totalProfiles: number
  activeSubscriptions: number
  pendingVerifications: number
  totalRevenue: number
  verifiedThisWeek: number
  rejectedCount: number
  incompleteCount: number
  slaBreachCount: number
  pendingByType: {
    photos: number
    govtId: number
    horoscope: number
  }
}

export type PendingVerificationRow = {
  id: string
  profileId: string
  fullName: string
  city: string
  phone: string
  method: "selfie" | "govt_id"
  govtIdType?: string
  hasHoroscope: boolean
  submittedAt: string
  slaBreached: boolean
  primaryPhoto: string
}

export type AdminReport = {
  id: string
  profileId: string
  profileName: string
  category: ReportCategory
  description: string
  reportedBy: string
  status: ReportStatus
  createdAt: string
}

export type AuditEntry = {
  id: string
  profileId: string
  profileName: string
  action: "approved" | "rejected" | "suspended" | "created"
  staffName: string
  staffEmail: string
  note?: string
  createdAt: string
}

const STAFF = [
  { id: "staff-1", email: DEMO_ADMIN_EMAIL, password: DEMO_ADMIN_PASSWORD, name: "Priya Admin", role: "admin" as const },
  { id: "staff-2", email: "moderator@astalakshimi.in", password: "Mod@2026", name: "Ravi Moderator", role: "moderator" as const },
]

function hoursAgo(h: number) {
  return new Date(Date.now() - h * 60 * 60 * 1000).toISOString()
}

function daysAgo(d: number) {
  return new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString()
}

function photoSet(urls: readonly string[], status: PhotoReviewStatus = "pending"): AdminProfilePhoto[] {
  return urls.map((url, i) => ({
    id: `ph-${Math.random().toString(36).slice(2, 9)}`,
    url,
    status,
    isPrimary: i === 0,
  }))
}

function calcCompleteness(p: Partial<AdminProfile>): number {
  let score = 0
  if (p.fullName && p.fullName.length >= 3) score += 15
  if (p.phone && p.phone.length === 10) score += 10
  if (p.city) score += 10
  if (p.religion && p.caste && p.motherTongue) score += 15
  if (p.photos && p.photos.length >= 1) score += 20
  if (p.aboutMe && p.aboutMe.length >= 20) score += 10
  if (p.birthTime && p.birthPlace) score += 10
  if (p.verificationStatus === "verified") score += 10
  return Math.min(100, score)
}

function seedProfiles(): AdminProfile[] {
  const base = (overrides: Partial<AdminProfile> & Pick<AdminProfile, "id" | "fullName" | "phone">): AdminProfile => {
    const photos = overrides.photos ?? photoSet([IMAGES.profiles.priya[0]])
    const profile: AdminProfile = {
      profileFor: "Myself",
      gender: "Female",
      city: "Chennai",
      state: "Tamil Nadu",
      religion: "Hindu",
      caste: "Brahmin",
      motherTongue: "Tamil",
      dobDay: "15",
      dobMonth: "06",
      dobYear: "1998",
      maritalStatus: "Never Married",
      brothersCount: 1,
      sistersCount: 0,
      aboutMe: "Family-oriented professional looking for a compatible match.",
      verificationMethod: "selfie",
      verificationStatus: "pending",
      selfiePhoto: IMAGES.profiles.priya[0],
      govtIdType: "",
      govtIdPhoto: "",
      horoscopeName: "",
      birthTime: "",
      birthPlace: "",
      rashi: "",
      star: "",
      manglik: "Don't know",
      completeness: 0,
      createdBy: "self",
      accountStatus: "active",
      submittedAt: hoursAgo(4),
      activeSubscription: false,
      ...overrides,
      photos,
    }
    profile.completeness = calcCompleteness(profile)
    return profile
  }

  return []
}

function seedReports(): AdminReport[] {
  return [
    {
      id: "rep-001",
      profileId: "adm-006",
      profileName: "Arjun T",
      category: "fake_id",
      description: "Member reported mismatched name on ID document.",
      reportedBy: "Member #4421",
      status: "new",
      createdAt: hoursAgo(20),
    },
    {
      id: "rep-002",
      profileId: "adm-011",
      profileName: "Sanjay G",
      category: "harassment",
      description: "Multiple members flagged inappropriate messages.",
      reportedBy: "Member #1188",
      status: "actioned",
      createdAt: daysAgo(2),
    },
    {
      id: "rep-003",
      profileId: "adm-001",
      profileName: "Priya S",
      category: "inappropriate_photo",
      description: "Photo appears to be a stock image.",
      reportedBy: "Automated flag",
      status: "new",
      createdAt: hoursAgo(3),
    },
  ]
}

function seedAudit(): AuditEntry[] {
  return [
    {
      id: "aud-001",
      profileId: "adm-004",
      profileName: "Meera V",
      action: "approved",
      staffName: "Priya Admin",
      staffEmail: DEMO_ADMIN_EMAIL,
      createdAt: daysAgo(4),
    },
    {
      id: "aud-002",
      profileId: "adm-006",
      profileName: "Arjun T",
      action: "rejected",
      staffName: "Priya Admin",
      staffEmail: DEMO_ADMIN_EMAIL,
      note: "Government ID image is blurry and unreadable.",
      createdAt: daysAgo(2),
    },
    {
      id: "aud-003",
      profileId: "adm-011",
      profileName: "Sanjay G",
      action: "suspended",
      staffName: "Ravi Moderator",
      staffEmail: "moderator@astalakshimi.in",
      note: "Harassment report confirmed.",
      createdAt: daysAgo(1),
    },
  ]
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback
  try {
    const raw = sessionStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined") return
  sessionStorage.setItem(key, JSON.stringify(value))
}

export function loadAdminSession(): AdminSession | null {
  return readJson<AdminSession | null>(ADMIN_SESSION_KEY, null)
}

export function saveAdminSession(session: AdminSession) {
  writeJson(ADMIN_SESSION_KEY, session)
}

export function clearAdminSession() {
  if (typeof window === "undefined") return
  sessionStorage.removeItem(ADMIN_SESSION_KEY)
}

export function adminLogin(email: string, password: string): AdminSession | null {
  const staff = STAFF.find((s) => s.email.toLowerCase() === email.toLowerCase() && s.password === password)
  if (!staff) return null
  const session: AdminSession = {
    staffId: staff.id,
    email: staff.email,
    name: staff.name,
    role: staff.role,
    loggedInAt: new Date().toISOString(),
  }
  saveAdminSession(session)
  return session
}

export function ensureAdminSeedData() {
  if (typeof window === "undefined") return
  if (!sessionStorage.getItem(ADMIN_PROFILES_KEY)) {
    writeJson(ADMIN_PROFILES_KEY, seedProfiles())
  }
  if (!sessionStorage.getItem(ADMIN_REPORTS_KEY)) {
    writeJson(ADMIN_REPORTS_KEY, seedReports())
  }
  if (!sessionStorage.getItem(ADMIN_AUDIT_KEY)) {
    writeJson(ADMIN_AUDIT_KEY, seedAudit())
  }
}

export function loadAdminProfiles(): AdminProfile[] {
  ensureAdminSeedData()
  return readJson(ADMIN_PROFILES_KEY, seedProfiles())
}

export function saveAdminProfiles(profiles: AdminProfile[]) {
  writeJson(ADMIN_PROFILES_KEY, profiles)
}

export function getAdminProfile(id: string): AdminProfile | null {
  return loadAdminProfiles().find((p) => p.id === id) ?? null
}

export function loadAdminReports(): AdminReport[] {
  ensureAdminSeedData()
  return readJson(ADMIN_REPORTS_KEY, seedReports())
}

export function saveAdminReports(reports: AdminReport[]) {
  writeJson(ADMIN_REPORTS_KEY, reports)
}

export function loadAdminAudit(): AuditEntry[] {
  ensureAdminSeedData()
  return readJson(ADMIN_AUDIT_KEY, seedAudit())
}

export function saveAdminAudit(entries: AuditEntry[]) {
  writeJson(ADMIN_AUDIT_KEY, entries)
}

export function appendAudit(entry: Omit<AuditEntry, "id" | "createdAt">) {
  const next: AuditEntry = {
    ...entry,
    id: `aud-${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
  }
  const items = [next, ...loadAdminAudit()].slice(0, 100)
  saveAdminAudit(items)
  return next
}

export function isSlaBreached(submittedAt: string) {
  const ms = Date.now() - new Date(submittedAt).getTime()
  return ms > VERIFICATION_SLA_HOURS * 60 * 60 * 1000
}

export function getAdminStats(): AdminStats {
  const profiles = loadAdminProfiles()
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const pending = profiles.filter((p) => p.verificationStatus === "pending")

  return {
    totalUsers: profiles.length,
    totalProfiles: profiles.length,
    activeSubscriptions: profiles.filter((p) => p.activeSubscription).length,
    pendingVerifications: pending.length,
    totalRevenue: 284_700,
    verifiedThisWeek: profiles.filter(
      (p) => p.verificationStatus === "verified" && p.reviewedAt && new Date(p.reviewedAt).getTime() >= weekAgo
    ).length,
    rejectedCount: profiles.filter((p) => p.verificationStatus === "rejected").length,
    incompleteCount: profiles.filter((p) => p.completeness < 80).length,
    slaBreachCount: pending.filter((p) => isSlaBreached(p.submittedAt)).length,
    pendingByType: {
      photos: pending.filter((p) => p.photos.some((ph) => ph.status === "pending")).length,
      govtId: pending.filter((p) => p.verificationMethod === "govt_id").length,
      horoscope: pending.filter((p) => Boolean(p.horoscopeName)).length,
    },
  }
}

export function getPendingVerifications(): PendingVerificationRow[] {
  return loadAdminProfiles()
    .filter((p) => p.verificationStatus === "pending")
    .map((p) => ({
      id: `ver-${p.id}`,
      profileId: p.id,
      fullName: p.fullName,
      city: p.city,
      phone: p.phone,
      method: (p.verificationMethod || "selfie") as "selfie" | "govt_id",
      govtIdType: p.govtIdType || undefined,
      hasHoroscope: Boolean(p.horoscopeName),
      submittedAt: p.submittedAt,
      slaBreached: isSlaBreached(p.submittedAt),
      primaryPhoto: p.photos[0]?.url ?? IMAGES.profiles.priya[0],
    }))
    .sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime())
}

export function approveProfile(profileId: string, staff: AdminSession) {
  const profiles = loadAdminProfiles()
  const idx = profiles.findIndex((p) => p.id === profileId)
  if (idx < 0) return null
  const updated: AdminProfile = {
    ...profiles[idx],
    verificationStatus: "verified",
    photos: profiles[idx].photos.map((ph) => ({ ...ph, status: "approved" as const })),
    reviewedAt: new Date().toISOString(),
    reviewedBy: staff.name,
    rejectionReason: undefined,
    completeness: calcCompleteness({ ...profiles[idx], verificationStatus: "verified" }),
  }
  profiles[idx] = updated
  saveAdminProfiles(profiles)
  appendAudit({
    profileId,
    profileName: updated.fullName,
    action: "approved",
    staffName: staff.name,
    staffEmail: staff.email,
  })
  return updated
}

export function rejectProfile(profileId: string, staff: AdminSession, rejectionReason: string) {
  const profiles = loadAdminProfiles()
  const idx = profiles.findIndex((p) => p.id === profileId)
  if (idx < 0) return null
  const updated: AdminProfile = {
    ...profiles[idx],
    verificationStatus: "rejected",
    rejectionReason,
    reviewedAt: new Date().toISOString(),
    reviewedBy: staff.name,
  }
  profiles[idx] = updated
  saveAdminProfiles(profiles)
  appendAudit({
    profileId,
    profileName: updated.fullName,
    action: "rejected",
    staffName: staff.name,
    staffEmail: staff.email,
    note: rejectionReason,
  })
  return updated
}

export function suspendProfile(profileId: string, staff: AdminSession) {
  const profiles = loadAdminProfiles()
  const idx = profiles.findIndex((p) => p.id === profileId)
  if (idx < 0) return null
  const updated: AdminProfile = { ...profiles[idx], accountStatus: "suspended" }
  profiles[idx] = updated
  saveAdminProfiles(profiles)
  appendAudit({
    profileId,
    profileName: updated.fullName,
    action: "suspended",
    staffName: staff.name,
    staffEmail: staff.email,
  })
  return updated
}

export function createAdminProfile(
  input: Omit<AdminProfile, "id" | "completeness" | "submittedAt"> & { markVerified?: boolean },
  staff: AdminSession
) {
  const profiles = loadAdminProfiles()
  const id = `adm-${String(profiles.length + 1).padStart(3, "0")}`
  const profile: AdminProfile = {
    ...input,
    id,
    verificationStatus: input.markVerified ? "verified" : input.verificationStatus ?? "pending",
    submittedAt: new Date().toISOString(),
    createdBy: "staff",
    createdByStaff: staff.name,
    accountStatus: "active",
    completeness: 0,
    photos: input.photos.length
      ? input.photos
      : photoSet([IMAGES.profiles.priya[0]], input.markVerified ? "approved" : "pending"),
  }
  profile.completeness = calcCompleteness(profile)
  profiles.unshift(profile)
  saveAdminProfiles(profiles)
  appendAudit({
    profileId: id,
    profileName: profile.fullName,
    action: "created",
    staffName: staff.name,
    staffEmail: staff.email,
    note: input.markVerified ? "Created and marked verified" : undefined,
  })
  return profile
}

export function updateAdminProfile(profileId: string, patch: Partial<AdminProfile>) {
  const profiles = loadAdminProfiles()
  const idx = profiles.findIndex((p) => p.id === profileId)
  if (idx < 0) return null
  const updated = { ...profiles[idx], ...patch }
  updated.completeness = calcCompleteness(updated)
  profiles[idx] = updated
  saveAdminProfiles(profiles)
  return updated
}

export function actionReport(reportId: string) {
  const reports = loadAdminReports()
  const idx = reports.findIndex((r) => r.id === reportId)
  if (idx < 0) return null
  reports[idx] = { ...reports[idx], status: "actioned" }
  saveAdminReports(reports)
  return reports[idx]
}

export function formatAdminDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function formatRelativeHours(iso: string) {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60))
  if (h < 1) return "Just now"
  if (h === 1) return "1 hour ago"
  if (h < 24) return `${h} hours ago`
  const d = Math.floor(h / 24)
  return d === 1 ? "1 day ago" : `${d} days ago`
}
