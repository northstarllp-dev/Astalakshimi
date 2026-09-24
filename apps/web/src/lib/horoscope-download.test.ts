import { describe, it, expect, vi, beforeEach } from "vitest"
import { startHoroscopeDownload } from "./horoscope-download"

const downloadHoroscope = vi.fn()

vi.mock("@/lib/api-client", () => ({
  apiClient: {
    media: {
      downloadHoroscope: (...args: unknown[]) => downloadHoroscope(...args),
    },
  },
}))

describe("startHoroscopeDownload", () => {
  beforeEach(() => {
    downloadHoroscope.mockReset()
    downloadHoroscope.mockResolvedValue({
      url: "https://signed.example/chart.pdf",
      fileName: "chart.pdf",
    })
  })

  it("downloads the horoscope from the signed S3 url", async () => {
    const clicked: HTMLAnchorElement[] = []
    const original = document.createElement.bind(document)
    vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      const node = original(tagName)
      if (tagName === "a") {
        node.click = () => clicked.push(node as HTMLAnchorElement)
      }
      return node
    })

    const result = await startHoroscopeDownload("kundli.pdf")

    expect(downloadHoroscope).toHaveBeenCalledOnce()
    expect(result).toEqual({
      url: "https://signed.example/chart.pdf",
      fileName: "chart.pdf",
    })
    expect(clicked).toHaveLength(1)
    expect(clicked[0].href).toBe("https://signed.example/chart.pdf")
    expect(clicked[0].download).toBe("chart.pdf")
  })
})
