import { load, type Cashfree as CashfreeInstance } from "@cashfreepayments/cashfree-js"

let cashfree: CashfreeInstance | null = null

export type CashfreeCheckoutResult =
  | { error: { message: string } }
  | { redirect: true }
  | { paymentDetails: { paymentMessage: string } }

export async function initCashfree() {
  if (typeof window === "undefined") {
    throw new Error("Cashfree can only run in the browser.")
  }
  if (cashfree) return cashfree

  const mode = process.env.NEXT_PUBLIC_CASHFREE_ENVIRONMENT === "production" ? "production" : "sandbox"
  cashfree = await load({ mode })
  if (!cashfree) throw new Error("Cashfree SDK failed to load.")
  return cashfree
}

export async function openCashfreeCheckout(options: {
  paymentSessionId: string
  redirectTarget?: "_self" | "_modal" | "_blank" | "_top" | HTMLElement
}): Promise<CashfreeCheckoutResult> {
  const cf = await initCashfree()
  return cf.checkout({
    paymentSessionId: options.paymentSessionId,
    redirectTarget: options.redirectTarget ?? "_modal",
  }) as Promise<CashfreeCheckoutResult>
}
