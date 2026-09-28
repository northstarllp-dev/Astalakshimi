import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import type { Cashfree as CashfreeInstance } from "@cashfreepayments/cashfree-js"

const loadMock = vi.fn()

vi.mock("@cashfreepayments/cashfree-js", () => ({
  load: (...args: unknown[]) => loadMock(...args),
}))

describe("cashfree loader", () => {
  beforeEach(() => {
    loadMock.mockReset()
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("initCashfree rejects on the server", async () => {
    vi.stubGlobal("window", undefined)
    const { initCashfree } = await import("./cashfree")
    await expect(initCashfree()).rejects.toThrow("Cashfree can only run in the browser.")
  })

  it("throws when load returns null", async () => {
    loadMock.mockResolvedValue(null)
    const { initCashfree } = await import("./cashfree")
    await expect(initCashfree()).rejects.toThrow("Cashfree SDK failed to load.")
  })

  it("openCashfreeCheckout passes session and default redirect target", async () => {
    const checkout = vi.fn().mockResolvedValue({
      paymentDetails: { paymentMessage: "ok" },
    })
    loadMock.mockResolvedValue({ checkout } as unknown as CashfreeInstance)

    const { openCashfreeCheckout } = await import("./cashfree")
    const result = await openCashfreeCheckout({ paymentSessionId: "sess_1" })

    expect(loadMock).toHaveBeenCalledWith({ mode: "sandbox" })
    expect(checkout).toHaveBeenCalledWith({
      paymentSessionId: "sess_1",
      redirectTarget: "_modal",
    })
    expect(result).toEqual({ paymentDetails: { paymentMessage: "ok" } })
  })
})
