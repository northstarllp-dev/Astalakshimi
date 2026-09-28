declare module "@cashfreepayments/cashfree-js" {
  export type Cashfree = {
    checkout: (options: {
      paymentSessionId: string
      redirectTarget?: "_self" | "_modal" | "_blank" | "_top" | HTMLElement
    }) => Promise<unknown>
  }

  export function load(options: { mode: "sandbox" | "production" }): Promise<Cashfree | null>
}
