import { describe, it, expect } from "vitest"
import {
  parseBirthTime,
  formatBirthTime,
  maskClockInput,
  parseWeight,
  formatWeight,
  convertWeightAmount,
  maskWeightInput,
  parseHeightToCm,
  formatHeightFromCm,
  displayHeight,
  heightToCm,
  weightToKg,
  formatWeightFromKg,
  maskHeightInput,
  DEFAULT_HEIGHT_CM,
} from "./input-units"

describe("parseBirthTime", () => {
  it("parses 12-hour with am/pm", () => {
    expect(parseBirthTime("10:30 AM")).toEqual({ clock: "10:30", meridiem: "AM" })
    expect(parseBirthTime("10:30 pm")).toEqual({ clock: "10:30", meridiem: "PM" })
  })
  it("converts 24-hour 13:45 to 01:45 PM", () => {
    expect(parseBirthTime("13:45")).toEqual({ clock: "01:45", meridiem: "PM" })
  })
  it("treats 00:30 as 12:30 AM", () => {
    expect(parseBirthTime("00:30")).toEqual({ clock: "12:30", meridiem: "AM" })
  })
  it("returns empty clock for blank input", () => {
    expect(parseBirthTime("")).toEqual({ clock: "", meridiem: "AM" })
  })
  it("keeps dot notation as colon", () => {
    expect(parseBirthTime("9.30 PM")).toEqual({ clock: "9:30", meridiem: "PM" })
  })
})

describe("formatBirthTime", () => {
  it("joins clock and meridiem", () => {
    expect(formatBirthTime("10:30", "AM")).toBe("10:30 AM")
  })
  it("returns empty for blank clock", () => {
    expect(formatBirthTime("", "AM")).toBe("")
  })
})

describe("maskClockInput", () => {
  it("masks 4 digits into HH:MM", () => {
    expect(maskClockInput("1030")).toBe("10:30")
  })
  it("keeps <=2 digits as-is", () => {
    expect(maskClockInput("1")).toBe("1")
    expect(maskClockInput("12")).toBe("12")
  })
  it("strips non-digits and caps at 4", () => {
    expect(maskClockInput("1a0b3c0d")).toBe("10:30")
  })
})

describe("parseWeight", () => {
  it("detects lbs unit", () => {
    expect(parseWeight("140 lbs")).toEqual({ amount: "140", unit: "lbs" })
    expect(parseWeight("140 pounds")).toEqual({ amount: "140", unit: "lbs" })
  })
  it("defaults to kg", () => {
    expect(parseWeight("65 kg")).toEqual({ amount: "65", unit: "kg" })
    expect(parseWeight("65")).toEqual({ amount: "65", unit: "kg" })
  })
  it("returns empty for blank", () => {
    expect(parseWeight("")).toEqual({ amount: "", unit: "kg" })
  })
})

describe("formatWeight", () => {
  it("formats amount with unit", () => {
    expect(formatWeight("65", "kg")).toBe("65 kg")
  })
  it("returns empty for blank amount", () => {
    expect(formatWeight("", "kg")).toBe("")
  })
})

describe("convertWeightAmount", () => {
  it("is identity when units match", () => {
    expect(convertWeightAmount("65", "kg", "kg")).toBe("65")
  })
  it("converts kg to lbs (rounded)", () => {
    expect(convertWeightAmount("65", "kg", "lbs")).toBe("143")
  })
  it("converts lbs to kg (rounded)", () => {
    expect(convertWeightAmount("143", "lbs", "kg")).toBe("65")
  })
  it("passes through non-numeric", () => {
    expect(convertWeightAmount("", "kg", "lbs")).toBe("")
  })
})

describe("maskWeightInput", () => {
  it("keeps up to 3 whole digits", () => {
    expect(maskWeightInput("123")).toBe("123")
  })
  it("allows one decimal place", () => {
    expect(maskWeightInput("65.5")).toBe("65.5")
  })
  it("strips non-numeric", () => {
    expect(maskWeightInput("a6b5.c5d")).toBe("65.5")
  })
})

describe("parseHeightToCm", () => {
  it("parses cm string directly", () => {
    expect(parseHeightToCm("165")).toBe(165)
  })
  it("parses feet'inches", () => {
    expect(parseHeightToCm("5'11\"")).toBe(180)
    expect(parseHeightToCm("5'11")).toBe(180)
    expect(parseHeightToCm("5 11")).toBe(180)
  })
  it("returns null for empty", () => {
    expect(parseHeightToCm("")).toBeNull()
    expect(parseHeightToCm(null)).toBeNull()
    expect(parseHeightToCm(undefined)).toBeNull()
  })
  it("returns null for out-of-range cm", () => {
    expect(parseHeightToCm("100")).toBeNull()
    expect(parseHeightToCm("250")).toBeNull()
  })
  it("returns null when inches > 11", () => {
    expect(parseHeightToCm("5'12")).toBeNull()
  })
})

describe("formatHeightFromCm", () => {
  it("formats 180 as 5'11\"", () => {
    expect(formatHeightFromCm(180)).toBe("5'11\"")
  })
  it("formats 165 as 5'5\"", () => {
    expect(formatHeightFromCm(165)).toBe("5'5\"")
  })
})

describe("displayHeight", () => {
  it("returns empty for blank", () => {
    expect(displayHeight("")).toBe("")
    expect(displayHeight(null)).toBe("")
  })
  it("converts legacy cm to feet/inches", () => {
    expect(displayHeight("180")).toBe("5'11\"")
  })
  it("passes through feet/inches strings", () => {
    expect(displayHeight("5'11\"")).toBe("5'11\"")
  })
})

describe("heightToCm", () => {
  it("falls back to default when unparseable", () => {
    expect(heightToCm("")).toBe(DEFAULT_HEIGHT_CM)
  })
  it("returns parsed cm when valid", () => {
    expect(heightToCm("5'11\"")).toBe(180)
  })
})

describe("weightToKg", () => {
  it("converts kg strings", () => {
    expect(weightToKg("65 kg")).toBe(65)
  })
  it("converts lbs strings", () => {
    expect(weightToKg("143 lbs")).toBe(65)
  })
  it("returns null for empty", () => {
    expect(weightToKg("")).toBeNull()
    expect(weightToKg(null)).toBeNull()
  })
  it("returns null for out-of-range", () => {
    expect(weightToKg("10 kg")).toBeNull()
    expect(weightToKg("500 kg")).toBeNull()
  })
})

describe("formatWeightFromKg", () => {
  it("formats kg as string", () => {
    expect(formatWeightFromKg(65)).toBe("65 kg")
  })
  it("returns empty for null/zero", () => {
    expect(formatWeightFromKg(null)).toBe("")
    expect(formatWeightFromKg(0)).toBe("")
  })
})

describe("maskHeightInput", () => {
  it("masks single digit as feet", () => {
    expect(maskHeightInput("5")).toBe("5")
  })
  it("masks 511 as 5'11\"", () => {
    expect(maskHeightInput("511")).toBe("5'11\"")
  })
  it("clamps inches at 11", () => {
    expect(maskHeightInput("599")).toBe("5'11\"")
  })
  it("returns empty for blank", () => {
    expect(maskHeightInput("")).toBe("")
  })
})
