declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayInstance
  }
}

type RazorpayCheckoutOptions = {
  key: string
  amount: number | string
  currency: string
  name?: string
  description?: string
  order_id: string
  prefill?: { contact?: string; email?: string; name?: string }
  handler: (response: {
    razorpay_order_id: string
    razorpay_payment_id: string
    razorpay_signature: string
  }) => void | Promise<void>
  modal?: { ondismiss?: () => void }
}

type RazorpayInstance = {
  open: () => void
  on: (event: string, handler: (response: unknown) => void) => void
}

function loadRazorpayScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Razorpay can only run in the browser."))
  }
  if (window.Razorpay) return Promise.resolve()

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-razorpay="checkout"]')
    if (existing) {
      existing.addEventListener("load", () => resolve())
      existing.addEventListener("error", () => reject(new Error("Failed to load Razorpay.")))
      return
    }
    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.async = true
    script.dataset.razorpay = "checkout"
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Failed to load Razorpay checkout script."))
    document.body.appendChild(script)
  })
}

export type RazorpayPaymentResult = {
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
}

/** Opens the live Razorpay Checkout modal and resolves with the payment signature payload. */
export async function openRazorpayCheckout(input: {
  keyId: string
  orderId: string
  amount: number | string
  currency?: string
  name?: string
  description?: string
}): Promise<RazorpayPaymentResult> {
  if (!input.keyId) {
    throw new Error("Razorpay key is missing. Set RAZORPAY_KEY_ID on the API.")
  }

  await loadRazorpayScript()
  if (!window.Razorpay) {
    throw new Error("Razorpay failed to initialize.")
  }

  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay!({
      key: input.keyId,
      amount: input.amount,
      currency: input.currency || "INR",
      name: input.name || "Ashtalakshmi",
      description: input.description,
      order_id: input.orderId,
      handler: (response) => {
        resolve({
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        })
      },
      modal: {
        ondismiss: () => reject(new Error("Payment cancelled.")),
      },
    })
    rzp.open()
  })
}
