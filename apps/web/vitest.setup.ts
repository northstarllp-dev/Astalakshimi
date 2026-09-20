import "@testing-library/jest-dom/vitest"
import { afterEach, beforeAll, vi } from "vitest"
import { cleanup } from "@testing-library/react"

// jsdom lacks APIs the app touches; polyfill the safe ones.
beforeAll(() => {
  if (!("matchMedia" in window)) {
    // @ts-expect-error minimal stub
    window.matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })
  }
  if (!("IntersectionObserver" in window)) {
    // @ts-expect-error minimal stub
    window.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return []
      }
    }
  }
  if (!("ResizeObserver" in window)) {
    // @ts-expect-error minimal stub
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
  }
  // scrollTo is a no-op in jsdom
  ;(window as any).scrollTo = () => {}
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  localStorage.clear()
  sessionStorage.clear()
})
