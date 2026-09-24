import { apiClient } from "@/lib/api-client"

/** Opens the member's horoscope through a short-lived S3 download URL. */
export async function startHoroscopeDownload(fallbackName: string) {
  const { url, fileName } = await apiClient.media.downloadHoroscope()
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = fileName || fallbackName || "horoscope.pdf"
  anchor.target = "_blank"
  anchor.rel = "noopener noreferrer"
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  return { url, fileName }
}
