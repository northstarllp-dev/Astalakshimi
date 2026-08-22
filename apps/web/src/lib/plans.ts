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
