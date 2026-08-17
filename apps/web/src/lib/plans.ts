export type PlanId = "free" | "silver" | "gold" | "platinum" | "diamond"

export const PLAN_IDS: PlanId[] = ["free", "silver", "gold", "platinum", "diamond"]

export type PlanFeatureValue = boolean | string

export type PlanFeature = {
  key: string
  label: string
  free: PlanFeatureValue
  silver: PlanFeatureValue
  gold: PlanFeatureValue
  platinum: PlanFeatureValue
  diamond: PlanFeatureValue
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
export const EXTRA_CONTACT_FEE = 29

/** Feature matrix for the comparison table */
export const PLAN_FEATURE_MATRIX: PlanFeature[] = [
  {
    key: "photo_visibility",
    label: "Photo visibility",
    free: "Fully visible",
    silver: "Fully visible",
    gold: "Fully visible",
    platinum: "Fully visible",
    diamond: "Fully visible",
  },
  {
    key: "discover_filters",
    label: "Discover filters",
    free: "Basic only",
    silver: "Basic only",
    gold: "Advanced suite",
    platinum: "Advanced suite",
    diamond: "Advanced suite",
  },
  {
    key: "listing_priority",
    label: "Listing priority",
    free: "Standard",
    silver: "Standard",
    gold: "Priority boost",
    platinum: "Priority boost",
    diamond: "Priority boost",
  },
  {
    key: "interest_quota",
    label: "Interest quota",
    free: "30 / month",
    silver: "100 / 3 months",
    gold: "500 / 6 months",
    platinum: "Unlimited",
    diamond: "Unlimited",
  },
  {
    key: "contacts",
    label: "Contact unlocks",
    free: "3 unlocks · 50 chat messages",
    silver: "10 / month",
    gold: "Included",
    platinum: "Unlimited",
    diamond: "Unlimited",
  },
  {
    key: "extra_contact",
    label: "Extra contact",
    free: `₹${EXTRA_CONTACT_FEE} each`,
    silver: `₹${EXTRA_CONTACT_FEE} each`,
    gold: `₹${EXTRA_CONTACT_FEE} each`,
    platinum: `₹${EXTRA_CONTACT_FEE} each`,
    diamond: `₹${EXTRA_CONTACT_FEE} each`,
  },
  {
    key: "mutual_unlock",
    label: "Mutual details unlock",
    free: false,
    silver: "Horoscope & contact",
    gold: "Horoscope & contact",
    platinum: "Horoscope & contact",
    diamond: "Horoscope & contact",
  },
  {
    key: "validity",
    label: "Plan validity",
    free: "Indefinite",
    silver: "3 months",
    gold: "6 months",
    platinum: "12 months",
    diamond: "Until marriage",
  },
]

export const MEMBERSHIP_PLANS: MembershipPlan[] = [
  {
    id: "free",
    name: "Free",
    price: "₹0",
    priceInPaise: 0,
    period: "Indefinite",
    durationDays: 36500,
    tagline: "Browse matches and send a few interests to get started.",
    features: [
      "Photos fully visible",
      "Basic discover filters",
      "30 interests / month",
      "3 contact unlocks · 50 chat messages",
      `₹${EXTRA_CONTACT_FEE} per extra contact`,
    ],
    unlocks: ["Profile search", "30 interests / month", "3 contact unlocks"],
  },
  {
    id: "silver",
    name: "Silver",
    price: "₹299",
    priceInPaise: 29900,
    period: "3 months",
    durationDays: 90,
    tagline: "More interests, monthly contacts, and mutual details.",
    features: [
      "100 interests / 3 months",
      "10 contact unlocks / month",
      "Horoscope & contact on mutual match",
      "Basic discover filters",
      `₹${EXTRA_CONTACT_FEE} per extra contact`,
    ],
    unlocks: ["10 contacts / month", "Horoscope & contact", "100 interests / 3 months"],
  },
  {
    id: "gold",
    name: "Gold",
    price: "₹499",
    priceInPaise: 49900,
    period: "6 months",
    durationDays: 180,
    badge: "Most popular",
    tagline: "Advanced filters and priority listing for serious matching.",
    features: [
      "500 interests / 6 months",
      "Advanced filter suite",
      "Priority listing boost",
      "Horoscope & contact on mutual match",
      `₹${EXTRA_CONTACT_FEE} per extra contact`,
    ],
    unlocks: ["Advanced filters", "Priority listing", "500 interests / 6 months", "Horoscope & contact"],
    highlighted: true,
  },
  {
    id: "platinum",
    name: "Platinum",
    price: "₹899",
    priceInPaise: 89900,
    period: "12 months",
    durationDays: 365,
    badge: "Best value",
    tagline: "Unlimited interests for a full year.",
    features: [
      "Unlimited interests",
      "Unlimited contact unlocks",
      "Advanced filter suite",
      "Priority listing boost",
      "Horoscope & contact on mutual match",
    ],
    unlocks: ["Unlimited interests", "Unlimited contacts", "Advanced filters", "Priority listing"],
  },
  {
    id: "diamond",
    name: "Diamond",
    price: "₹1,299",
    priceInPaise: 129900,
    period: "Until marriage",
    durationDays: 36500,
    badge: "Until you marry",
    tagline: "Stay on the highest plan until you find your match.",
    features: [
      "Unlimited interests",
      "Unlimited contact unlocks",
      "Advanced filter suite",
      "Priority listing boost",
      "Valid until marriage",
    ],
    unlocks: ["Unlimited interests", "Unlimited contacts", "Priority listing", "Until-marriage access"],
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
  if (PLAN_IDS.includes(raw as PlanId)) return raw as PlanId
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
