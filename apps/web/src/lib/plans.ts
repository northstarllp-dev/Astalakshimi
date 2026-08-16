export type MembershipPlan = {
  id: string
  name: string
  price: string
  period: string
  badge?: string
  features: string[]
  highlighted?: boolean
}

export const MEMBERSHIP_PLANS: MembershipPlan[] = [
  {
    id: "free",
    name: "Free for 3 months",
    price: "₹0",
    period: "Starting 14 Sep 2026",
    badge: "Free for 3 months, starting 14 September 2026",
    features: ["Community Plan", "Profile search", "Send interests", "Photo verification"],
    highlighted: true,
  },
  {
    id: "3m",
    name: "3 months",
    price: "₹300",
    period: "Community Plan",
    features: ["Plan Features", "Community Plan", "Daily matches", "Chat when both accept"],
  },
  {
    id: "6m",
    name: "6 months",
    price: "₹500",
    period: "Community Plan",
    features: ["Plan Features", "Community Plan", "Priority listing", "Horoscope match"],
  },
  {
    id: "9m",
    name: "9 months",
    price: "₹750",
    period: "Community Plan",
    features: ["Plan Features", "Community Plan", "More interests", "Contact views"],
  },
  {
    id: "12m",
    name: "12 months",
    price: "₹1000",
    period: "Community Plan",
    features: ["Plan Features", "Community Plan", "Full-year access", "Priority support"],
  },
  {
    id: "till-marry",
    name: "Till U Marry",
    price: "₹1500",
    period: "Community Plan",
    features: ["Plan Features", "Community Plan", "Unlimited duration", "Best value"],
  },
]

export const CURRENT_PLAN_ID = "free"

export const PLAN_STORAGE_KEY = "astalakshimi.plan"

export function getPlanById(id: string) {
  return MEMBERSHIP_PLANS.find((p) => p.id === id) ?? null
}

export function loadCurrentPlanId(): string {
  if (typeof window === "undefined") return CURRENT_PLAN_ID
  return sessionStorage.getItem(PLAN_STORAGE_KEY) || CURRENT_PLAN_ID
}

export function saveCurrentPlanId(id: string) {
  if (typeof window === "undefined") return
  sessionStorage.setItem(PLAN_STORAGE_KEY, id)
}
