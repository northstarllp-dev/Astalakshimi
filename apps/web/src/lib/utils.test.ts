import { describe, it, expect } from "vitest"
import { getMediaUrl, resolveMediaPath } from "./utils"

describe("resolveMediaPath / getMediaUrl", () => {
  it("accepts string keys and photo objects", () => {
    expect(resolveMediaPath("profiles/u/a.jpg")).toBe("profiles/u/a.jpg")
    expect(resolveMediaPath({ s3Key: "profiles/u/b.jpg" })).toBe("profiles/u/b.jpg")
    expect(resolveMediaPath({ url: "https://cdn/x.jpg" })).toBe("https://cdn/x.jpg")
    expect(resolveMediaPath(null)).toBe("")
    expect(resolveMediaPath({} as any)).toBe("")
  })

  it("does not throw when getMediaUrl receives a photo object", () => {
    const url = getMediaUrl({ s3Key: "profiles/u/c.jpg" })
    expect(url).toContain("profiles")
    expect(url).toContain("c.jpg")
  })
})
