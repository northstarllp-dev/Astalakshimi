export type Meridiem = "AM" | "PM"
export type WeightUnit = "kg" | "lbs"

const LBS_PER_KG = 2.20462

export function parseBirthTime(raw: string): { clock: string; meridiem: Meridiem } {
  const text = raw.trim()
  if (!text) return { clock: "", meridiem: "AM" }

  const meridiemMatch = text.match(/\b(am|pm)\b/i)
  let meridiem: Meridiem = meridiemMatch ? (meridiemMatch[1].toUpperCase() as Meridiem) : "AM"
  const clockRaw = text.replace(/\b(am|pm)\b/i, "").trim().replace(".", ":")

  const full = clockRaw.match(/^(\d{1,2}):(\d{2})$/)
  if (full) {
    const hour = Number(full[1])
    const minute = full[2]
    if (hour === 0) {
      if (!meridiemMatch) meridiem = "AM"
      return { clock: `12:${minute}`, meridiem }
    }
    if (hour > 12 && hour <= 23) {
      if (!meridiemMatch) meridiem = "PM"
      return { clock: `${String(hour - 12).padStart(2, "0")}:${minute}`, meridiem }
    }
  }

  return { clock: clockRaw, meridiem }
}

export function formatBirthTime(clock: string, meridiem: Meridiem): string {
  const trimmed = clock.trim()
  if (!trimmed) return ""
  return `${trimmed} ${meridiem}`
}

/** Keep digits and a colon so the field stays typeable as HH:MM. */
export function maskClockInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}:${digits.slice(2)}`
}

export function parseWeight(raw: string): { amount: string; unit: WeightUnit } {
  const text = raw.trim()
  if (!text) return { amount: "", unit: "kg" }
  const unit: WeightUnit = /\b(lbs?|pounds?)\b/i.test(text) ? "lbs" : "kg"
  const num = text.match(/\d+(?:\.\d+)?/)
  return { amount: num ? num[0] : "", unit }
}

export function formatWeight(amount: string, unit: WeightUnit): string {
  const trimmed = amount.trim()
  if (!trimmed) return ""
  return `${trimmed} ${unit}`
}

export function convertWeightAmount(amount: string, from: WeightUnit, to: WeightUnit): string {
  if (from === to) return amount
  const n = Number(amount)
  if (!Number.isFinite(n) || amount.trim() === "") return amount
  const converted = from === "kg" ? n * LBS_PER_KG : n / LBS_PER_KG
  return String(Math.round(converted))
}

export function maskWeightInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, "")
  const [whole, ...rest] = cleaned.split(".")
  if (rest.length === 0) return whole.slice(0, 3)
  return `${whole.slice(0, 3)}.${rest.join("").slice(0, 1)}`
}

export const DEFAULT_HEIGHT_CM = 165

/** Format stored cm as feet and inches, e.g. 180 → 5'11" */
export function formatHeightFromCm(cm: number): string {
  const totalInches = Math.round(cm / 2.54)
  const feet = Math.floor(totalInches / 12)
  const inches = totalInches % 12
  return `${feet}'${inches}"`
}

/** Accept feet/inches (5'11") or legacy cm strings (165). */
export function displayHeight(raw: string | undefined | null): string {
  const text = String(raw ?? "").trim()
  if (!text) return ""
  if (/^\d{2,3}$/.test(text)) return formatHeightFromCm(parseInt(text, 10))
  return text
}

export function heightToCm(raw: string): number {
  const text = raw.trim()
  if (!text) return DEFAULT_HEIGHT_CM

  if (/^\d{2,3}$/.test(text)) return parseInt(text, 10)

  const match = text.match(/^(\d{1,2})[''′]?\s*(\d{1,2})"?\s*$/)
  if (match) {
    const feet = parseInt(match[1], 10)
    const inches = parseInt(match[2], 10)
    if (Number.isFinite(feet) && Number.isFinite(inches)) {
      return Math.round(feet * 30.48 + inches * 2.54)
    }
  }

  const digits = text.replace(/\D/g, "").slice(0, 3)
  if (digits.length >= 2) {
    const feet = parseInt(digits[0], 10)
    const inches = Math.min(11, parseInt(digits.slice(1), 10) || 0)
    return Math.round(feet * 30.48 + inches * 2.54)
  }

  return DEFAULT_HEIGHT_CM
}

/** Mask typed digits into feet'inches" as the user types (e.g. 511 → 5'11"). */
export function maskHeightInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 3)
  if (!digits) return ""

  const feet = digits[0]
  if (digits.length === 1) return feet

  const inches = String(Math.min(11, parseInt(digits.slice(1), 10) || 0))
  return `${feet}'${inches}"`
}
