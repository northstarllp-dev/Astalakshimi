export const HOROSCOPE_ACCEPT = "application/pdf,image/jpeg,image/jpg"
export const MAX_HOROSCOPE_MB = 10

const HOROSCOPE_MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/jpg"])

export function normalizeHoroscopeContentType(contentType: string) {
  return contentType === "image/jpg" ? "image/jpeg" : contentType
}

export function isHoroscopePdfFileName(fileName?: string | null, s3Key?: string | null) {
  const name = (fileName || s3Key || "").toLowerCase()
  return name.endsWith(".pdf")
}

export function isHoroscopeImageFileName(fileName?: string | null, s3Key?: string | null) {
  const name = (fileName || s3Key || "").toLowerCase()
  return /\.(jpe?g)$/.test(name)
}

export function validateHoroscopeFile(file: File): string | null {
  const type = normalizeHoroscopeContentType(file.type)
  const name = file.name.toLowerCase()
  const allowedByType = HOROSCOPE_MIME_TYPES.has(type)
  const allowedByName =
    name.endsWith(".pdf") || name.endsWith(".jpg") || name.endsWith(".jpeg")

  if (!allowedByType && !allowedByName) {
    return "Please upload a PDF or JPG horoscope."
  }
  if (file.size > MAX_HOROSCOPE_MB * 1024 * 1024) {
    return `Horoscope file must be under ${MAX_HOROSCOPE_MB} MB.`
  }
  return null
}
