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

/** Parse a height string into cm, or null if empty/unparseable. */
export function parseHeightToCm(raw: string | undefined | null): number | null {
  const text = String(raw ?? "").trim()
  if (!text) return null

  if (/^\d{2,3}$/.test(text)) {
    const n = parseInt(text, 10)
    return Number.isFinite(n) && n >= 120 && n <= 230 ? n : null
  }

  const match = text.match(/^(\d{1,2})[''′]?\s*(\d{1,2})"?\s*$/)
  if (match) {
    const feet = parseInt(match[1], 10)
    const inches = parseInt(match[2], 10)
    if (!Number.isFinite(feet) || !Number.isFinite(inches) || inches > 11) return null
    const cm = Math.round(feet * 30.48 + inches * 2.54)
    return cm >= 120 && cm <= 230 ? cm : null
  }

  return null
}

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
  return parseHeightToCm(raw) ?? DEFAULT_HEIGHT_CM
}

/** Parse weight display strings like "65 kg" / "140 lbs" into whole kilograms. */
export function weightToKg(raw: string | undefined | null): number | null {
  const { amount, unit } = parseWeight(String(raw ?? ""))
  if (!amount) return null
  const n = Number(amount)
  if (!Number.isFinite(n) || n <= 0) return null
  const kg = unit === "lbs" ? Math.round(n / LBS_PER_KG) : Math.round(n)
  if (kg < 30 || kg > 200) return null
  return kg
}

export function formatWeightFromKg(kg: number | null | undefined): string {
  if (kg == null || !Number.isFinite(kg) || kg <= 0) return ""
  return formatWeight(String(kg), "kg")
}

/**
 * Mask typed digits into feet'inches" (e.g. 511 → 5'11").
 * Pass the previous display value so backspace after the closing quote
 * deletes the last digit instead of immediately putting the quote back.
 */
export function maskHeightInput(raw: string, previous?: string): string {
  let digits = raw.replace(/\D/g, "").slice(0, 3)
  const prev = previous ?? ""
  const prevDigits = prev.replace(/\D/g, "")
  const deletedTrailingQuote =
    prev.endsWith('"') && !raw.endsWith('"') && digits === prevDigits && raw.length < prev.length
  if (deletedTrailingQuote) {
    digits = digits.slice(0, -1)
  }
  if (!digits) return ""

  const feet = digits[0]
  if (digits.length === 1) return feet

  const inches = String(Math.min(11, parseInt(digits.slice(1), 10) || 0))
  return `${feet}'${inches}"`
}
