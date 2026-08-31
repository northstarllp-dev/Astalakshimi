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
