export type PlanId = "free" | "silver" | "gold" | "platinum"

export type PlanFeatureValue = boolean | string

export type PlanFeature = {
  key: string
  label: string
  free: PlanFeatureValue
  silver: PlanFeatureValue
  gold: PlanFeatureValue
  platinum: PlanFeatureValue
}

export type MembershipPlan = {
  id: PlanId
  name: string
  price: string
  priceInPaise: number
  period: string
  durationDays: number
  badge?: string
  tagline: string
  features: string[]
  unlocks: string[]
  highlighted?: boolean
}

export type SubscriptionRecord = {
  planId: PlanId
  startedAt: string
  expiresAt: string
}

export type InvoiceRecord = {
  id: string
  planId: PlanId
  planName: string
  amount: string
  method: string
  status: "paid" | "failed" | "refunded"
  paidAt: string
}

export const PLAN_STORAGE_KEY = "astalakshimi.plan"
export const SUBSCRIPTION_STORAGE_KEY = "astalakshimi.subscription"
export const INVOICES_STORAGE_KEY = "astalakshimi.invoices"
export const REFERRAL_STORAGE_KEY = "astalakshimi.referral"

export const CURRENT_PLAN_ID: PlanId = "free"
export const RENEWAL_WINDOW_DAYS = 7

/** Feature matrix for the comparison table */
export const PLAN_FEATURE_MATRIX: PlanFeature[] = [
  { key: "profile_search", label: "Profile search", free: true, silver: true, gold: true, platinum: true },
  { key: "photo_verification", label: "Photo verification", free: true, silver: true, gold: true, platinum: true },
  { key: "send_interests", label: "Send interests", free: "5 / month", silver: "20 / month", gold: "50 / month", platinum: "Unlimited" },
  { key: "view_photos", label: "View member photos", free: "Blurred", silver: true, gold: true, platinum: true },
  { key: "contact_details", label: "Contact details", free: false, silver: true, gold: true, platinum: true },
  { key: "advanced_filters", label: "Advanced filters", free: false, silver: "Basic", gold: true, platinum: true },
  { key: "horoscope_match", label: "Horoscope matching", free: false, silver: false, gold: true, platinum: true },
  { key: "priority_listing", label: "Priority in search", free: false, silver: false, gold: true, platinum: true },
  { key: "invoices", label: "Download invoices", free: false, silver: true, gold: true, platinum: true },
]

export const MEMBERSHIP_PLANS: MembershipPlan[] = [
  {
    id: "free",
    name: "Free",
    price: "₹0",
    priceInPaise: 0,
    period: "3 months",
    durationDays: 90,
    badge: "Free for 3 months from 14 Sep 2026",
    tagline: "Browse and send a few interests while you get started.",
    features: ["Profile search", "5 interests / month", "Photo verification", "Blurred photos until upgrade"],
    unlocks: ["Profile search", "Limited interests", "Photo verification"],
  },
  {
    id: "silver",
    name: "Silver",
    price: "₹499",
    priceInPaise: 49900,
    period: "3 months",
    durationDays: 90,
    tagline: "Unlock contacts and chat for serious matching.",
    features: ["Contact details", "20 interests / month", "View photos", "Basic filters"],
    unlocks: ["Contact details", "Advanced filters (basic)", "20 interests / month"],
  },
  {
    id: "gold",
    name: "Gold",
    price: "₹999",
    priceInPaise: 99900,
    period: "3 months",
    durationDays: 90,
    badge: "Most popular",
    tagline: "Maximum visibility with horoscope matching.",
    features: ["Everything in Silver", "50 interests / month", "Horoscope match", "Priority listing", "Full advanced filters"],
    unlocks: ["Contact details", "Advanced filters", "50 interests / month", "Horoscope match", "Priority listing"],
    highlighted: true,
  },
  {
    id: "platinum",
    name: "Platinum",
    price: "₹1,499",
    priceInPaise: 149900,
    period: "3 months",
    durationDays: 90,
    badge: "Best value",
    tagline: "Unlimited interests plus a dedicated relationship manager.",
    features: ["Everything in Gold", "Unlimited interests", "Priority support", "Assisted shortlist"],
    unlocks: [
      "Contact details",
      "Unlimited interests",
      "Horoscope match",
      "Priority listing",
    ],
  },
]

/** Optional duration add-ons shown under each paid tier on checkout */
export const DURATION_ADDONS = [
  { id: "3m", label: "3 months", multiplier: 1 },
  { id: "6m", label: "6 months", multiplier: 1.8, saveLabel: "Save 10%" },
  { id: "12m", label: "12 months", multiplier: 3.2, saveLabel: "Save 20%" },
] as const

export function getPlanById(id: string) {
  return MEMBERSHIP_PLANS.find((p) => p.id === id) ?? null
}

export function loadCurrentPlanId(): PlanId {
  if (typeof window === "undefined") return CURRENT_PLAN_ID
  const raw = sessionStorage.getItem(PLAN_STORAGE_KEY)
  if (raw === "silver" || raw === "gold" || raw === "platinum" || raw === "free") return raw
  // Migrate legacy duration plan ids to free
  if (raw && ["3m", "6m", "9m", "12m", "till-marry"].includes(raw)) return "silver"
  return CURRENT_PLAN_ID
}

export function saveCurrentPlanId(id: PlanId) {
  if (typeof window === "undefined") return
  sessionStorage.setItem(PLAN_STORAGE_KEY, id)
}

export function isPaidMember() {
  const id = loadCurrentPlanId()
  return id !== "free"
}

export function addDays(iso: string, days: number) {
  const d = new Date(iso)
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

export function loadSubscription(): SubscriptionRecord {
  if (typeof window === "undefined") {
    return defaultSubscription("free")
  }
  const raw = sessionStorage.getItem(SUBSCRIPTION_STORAGE_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as SubscriptionRecord
      if (parsed.planId && parsed.expiresAt) return parsed
    } catch {
      /* fall through */
    }
  }
  const planId = loadCurrentPlanId()
  const sub = defaultSubscription(planId)
  sessionStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(sub))
  return sub
}

export function defaultSubscription(planId: PlanId): SubscriptionRecord {
  const plan = getPlanById(planId) ?? MEMBERSHIP_PLANS[0]
  const startedAt = new Date().toISOString()
  return {
    planId,
    startedAt,
    expiresAt: addDays(startedAt, plan.durationDays),
  }
}

export function saveSubscription(sub: SubscriptionRecord) {
  if (typeof window === "undefined") return
  sessionStorage.setItem(SUBSCRIPTION_STORAGE_KEY, JSON.stringify(sub))
  saveCurrentPlanId(sub.planId)
}

export function activatePlan(planId: PlanId, durationDays?: number) {
  const plan = getPlanById(planId)
  if (!plan) return null
  const startedAt = new Date().toISOString()
  const sub: SubscriptionRecord = {
    planId,
    startedAt,
    expiresAt: addDays(startedAt, durationDays ?? plan.durationDays),
  }
  saveSubscription(sub)
  return sub
}

export function daysRemaining(expiresAt: string) {
  const ms = new Date(expiresAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

export function shouldShowRenewal(expiresAt: string) {
  const days = daysRemaining(expiresAt)
  return days > 0 && days <= RENEWAL_WINDOW_DAYS
}

export function formatExpiry(expiresAt: string) {
  return new Date(expiresAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function getUnlockPreview(planId: PlanId) {
  const plan = getPlanById(planId)
  return plan?.unlocks ?? []
}

export function loadInvoices(): InvoiceRecord[] {
  if (typeof window === "undefined") return []
  try {
    const raw = sessionStorage.getItem(INVOICES_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as InvoiceRecord[]) : []
  } catch {
    return []
  }
}

export function addInvoice(invoice: Omit<InvoiceRecord, "id" | "paidAt"> & { paidAt?: string }) {
  if (typeof window === "undefined") return null
  const record: InvoiceRecord = {
    id: `INV-${Date.now().toString(36).toUpperCase()}`,
    paidAt: invoice.paidAt ?? new Date().toISOString(),
    planId: invoice.planId,
    planName: invoice.planName,
    amount: invoice.amount,
    method: invoice.method,
    status: invoice.status,
  }
  const next = [record, ...loadInvoices()].slice(0, 20)
  sessionStorage.setItem(INVOICES_STORAGE_KEY, JSON.stringify(next))
  return record
}

export function getOrCreateReferralCode(seed?: string) {
  if (typeof window === "undefined") return "ASTA-GUEST"
  const existing = sessionStorage.getItem(REFERRAL_STORAGE_KEY)
  if (existing) return existing
  const base = (seed || "member")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 6)
    .toUpperCase()
  const code = `ASTA-${base || "HOME"}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
  sessionStorage.setItem(REFERRAL_STORAGE_KEY, code)
  return code
}

export function getReferralLink(code: string) {
  if (typeof window === "undefined") return `https://astalakshimi.in/register?ref=${code}`
  return `${window.location.origin}/register?ref=${code}`
}

export function featureCell(value: PlanFeatureValue) {
  if (value === true) return { type: "yes" as const, label: "Included" }
  if (value === false) return { type: "no" as const, label: "Locked" }
  return { type: "text" as const, label: value }
}

export function computeAddonPrice(basePaise: number, multiplier: number) {
  const paise = Math.round(basePaise * multiplier)
  const rupees = Math.round(paise / 100)
  return {
    paise,
    label: `₹${rupees.toLocaleString("en-IN")}`,
  }
}
