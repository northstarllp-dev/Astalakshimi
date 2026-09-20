import { describe, it, expect, vi, beforeEach } from "vitest"
import { openRazorpayCheckout } from "./razorpay"

function setupRazorpayMock(handler: (opts: any) => void) {
  (window as any).Razorpay = class {
    opts: any
    constructor(opts: any) {
      this.opts = opts
      handler(opts)
    }
    open() {}
    on() {}
  }
}

describe("openRazorpayCheckout", () => {
  beforeEach(() => {
    delete (window as any).Razorpay
    document.querySelectorAll('script[data-razorpay="checkout"]').forEach((s) => s.remove())
  })

  it("throws when keyId missing", async () => {
    await expect(
      openRazorpayCheckout({ keyId: "", orderId: "o1", amount: 100 }),
    ).rejects.toThrow("Razorpay key is missing")
  })

  it("resolves with payment payload on handler", async () => {
    setupRazorpayMock((opts) => {
      // simulate immediate success
      setTimeout(() => opts.handler({
        razorpay_order_id: "o1",
        razorpay_payment_id: "p1",
        razorpay_signature: "sig",
      }), 0)
    })
    const result = await openRazorpayCheckout({ keyId: "rzp_test_x", orderId: "o1", amount: 100 })
    expect(result).toEqual({
      razorpayOrderId: "o1",
      razorpayPaymentId: "p1",
      razorpaySignature: "sig",
    })
  })

  it("rejects on modal dismiss", async () => {
    setupRazorpayMock((opts) => {
      setTimeout(() => opts.modal.ondismiss(), 0)
    })
    await expect(
      openRazorpayCheckout({ keyId: "rzp_test_x", orderId: "o1", amount: 100 }),
    ).rejects.toThrow("Payment cancelled")
  })

  it("passes keyId, orderId, amount to Razorpay options", async () => {
    let captured: any
    setupRazorpayMock((opts) => {
      captured = opts
      setTimeout(() => opts.handler({ razorpay_order_id: "o1", razorpay_payment_id: "p1", razorpay_signature: "s" }), 0)
    })
    await openRazorpayCheckout({ keyId: "rzp_test_x", orderId: "order_9", amount: 49900, currency: "INR", name: "Ashtalakshmi" })
    expect(captured.key).toBe("rzp_test_x")
    expect(captured.order_id).toBe("order_9")
    expect(captured.amount).toBe(49900)
    expect(captured.currency).toBe("INR")
  })
})
