import { describe, it, expect } from "vitest"
import {
  PROFILE_DETAIL_TOTAL,
  PROFILE_DETAIL_FIELDS,
  getProfileCompletenessStats,
  getProfileCompleteness,
  getMissingRequiredFieldIds,
  getRequiredFieldEditHash,
  type ProfileDetailField,
} from "./profile-completeness"
import { emptySignupData, type SignupData } from "./profile-store"

describe("PROFILE_DETAIL_FIELDS", () => {
  it("has exactly PROFILE_DETAIL_TOTAL entries", () => {
    expect(PROFILE_DETAIL_FIELDS.length).toBe(PROFILE_DETAIL_TOTAL)
    expect(PROFILE_DETAIL_TOTAL).toBe(47)
  })
  it("every field has a unique id", () => {
    const ids = PROFILE_DETAIL_FIELDS.map((f) => f.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe("getProfileCompletenessStats", () => {
  it("returns 0% and all required missing for null data", () => {
    const stats = getProfileCompletenessStats(null)
    expect(stats.filled).toBe(0)
    expect(stats.percentage).toBe(0)
    expect(stats.requiredComplete).toBe(false)
    expect(stats.missingRequired.length).toBeGreaterThan(0)
  })
  it("returns 0% for empty signup data (defaults don't count)", () => {
    const stats = getProfileCompletenessStats(emptySignupData())
    expect(stats.filled).toBe(0)
    expect(stats.percentage).toBe(0)
  })
  it("counts signup fields after submit", () => {
    const data: SignupData = {
      ...emptySignupData(),
      profileFor: "Myself",
      fullName: "Test User",
      gender: "Male",
      dobDay: "01",
      dobMonth: "01",
      dobYear: "2000",
      maritalStatus: "Never Married",
      city: "Mumbai",
      height: "5'9\"",
      religion: "Hindu",
      caste: "Brahmin",
      motherTongue: "Hindi",
      photos: ["x"],
      diet: "Vegetarian",
      submittedAt: new Date().toISOString(),
    }
    const stats = getProfileCompletenessStats(data)
    expect(stats.filled).toBeGreaterThanOrEqual(11)
    expect(stats.percentage).toBeGreaterThanOrEqual(25)
  })
  it("requiredComplete is true when all required fields filled", () => {
    const data: SignupData = {
      ...emptySignupData(),
      profileFor: "Myself",
      fullName: "Test User",
      gender: "Male",
      dobDay: "01",
      dobMonth: "01",
      dobYear: "2000",
      maritalStatus: "Never Married",
      city: "Mumbai",
      height: "5'9\"",
      religion: "Hindu",
      caste: "Brahmin",
      motherTongue: "Hindi",
      photos: ["x"],
      star: "Rohini",
      rashi: "Vrishabha",
      manglik: "No",
      birthTime: "10:00 AM",
      birthPlace: "Delhi",
      educationLevel: "Bachelors",
      degree: "B.Tech",
      employmentStatus: "Employed",
      profession: "Engineer",
      annualIncome: "5-10",
      diet: "Vegetarian",
      prefReligion: ["Hindu"],
      prefMaritalStatuses: ["Never Married"],
      prefAgeMin: 25,
      prefAgeMax: 33,
      submittedAt: new Date().toISOString(),
    }
    const stats = getProfileCompletenessStats(data)
    expect(stats.requiredComplete).toBe(true)
    expect(stats.missingRequired).toEqual([])
  })
  it("percentage never exceeds 100", () => {
    const data: SignupData = {
      ...emptySignupData(),
      profileFor: "Myself",
      fullName: "Test User",
      gender: "Male",
      dobDay: "01",
      dobMonth: "01",
      dobYear: "2000",
      maritalStatus: "Never Married",
      city: "Mumbai",
      height: "5'9\"",
      religion: "Hindu",
      caste: "Brahmin",
      motherTongue: "Hindi",
      photos: ["x"],
      star: "Rohini",
      rashi: "Vrishabha",
      manglik: "No",
      birthTime: "10:00 AM",
      birthPlace: "Delhi",
      educationLevel: "Bachelors",
      degree: "B.Tech",
      employmentStatus: "Employed",
      profession: "Engineer",
      annualIncome: "5-10",
      weight: "70 kg",
      complexion: "Fair",
      diet: "Non-Vegetarian",
      aboutMe: "A long enough about me string here.",
      subcaste: "Some",
      gotra: "Some",
      collegeName: "Some College",
      companyName: "Some Co",
      familyType: "Joint",
      familyStatus: "Middle",
      familyValues: "Moderate",
      fatherOccupation: "Some",
      motherOccupation: "Some",
      willingToRelocate: "Yes",
      prefCastes: ["a"],
      prefLocations: ["b"],
      prefMotherTongues: ["c"],
      prefMinEducation: "Bachelor",
      submittedAt: new Date().toISOString(),
    }
    expect(getProfileCompletenessStats(data).percentage).toBeLessThanOrEqual(100)
  })
})

describe("getProfileCompleteness", () => {
  it("returns a number percentage", () => {
    expect(typeof getProfileCompleteness(null)).toBe("number")
    expect(getProfileCompleteness(null)).toBe(0)
  })
})

describe("getMissingRequiredFieldIds", () => {
  it("returns a Set of missing required ids", () => {
    const ids = getMissingRequiredFieldIds(null)
    expect(ids).toBeInstanceOf(Set)
    expect(ids.size).toBeGreaterThan(0)
  })
  it("is empty when all required filled", () => {
    const data: SignupData = {
      ...emptySignupData(),
      profileFor: "Myself",
      fullName: "Test User",
      gender: "Male",
      dobDay: "01",
      dobMonth: "01",
      dobYear: "2000",
      maritalStatus: "Never Married",
      city: "Mumbai",
      height: "5'9\"",
      religion: "Hindu",
      caste: "Brahmin",
      motherTongue: "Hindi",
      photos: ["x"],
      star: "Rohini",
      rashi: "Vrishabha",
      manglik: "No",
      birthTime: "10:00 AM",
      birthPlace: "Delhi",
      educationLevel: "Bachelors",
      degree: "B.Tech",
      employmentStatus: "Employed",
      profession: "Engineer",
      annualIncome: "5-10",
      diet: "Vegetarian",
      prefReligion: ["Hindu"],
      prefMaritalStatuses: ["Never Married"],
      prefAgeMin: 25,
      prefAgeMax: 33,
      submittedAt: new Date().toISOString(),
    }
    expect(getMissingRequiredFieldIds(data).size).toBe(0)
  })
})

describe("getRequiredFieldEditHash", () => {
  it("maps city to #location", () => {
    const cityField = PROFILE_DETAIL_FIELDS.find((f) => f.id === "city") as ProfileDetailField
    expect(getRequiredFieldEditHash(cityField)).toBe("#location")
  })
  it("maps photos group to #photos", () => {
    const photoField = PROFILE_DETAIL_FIELDS.find((f) => f.group === "photos") as ProfileDetailField
    expect(getRequiredFieldEditHash(photoField)).toBe("#photos")
  })
  it("maps career group to #career", () => {
    const careerField = PROFILE_DETAIL_FIELDS.find((f) => f.group === "career") as ProfileDetailField
    expect(getRequiredFieldEditHash(careerField)).toBe("#career")
  })
  it("maps horoscope group to #horoscope", () => {
    const hField = PROFILE_DETAIL_FIELDS.find((f) => f.group === "horoscope") as ProfileDetailField
    expect(getRequiredFieldEditHash(hField)).toBe("#horoscope")
  })
  it("maps community group to #community", () => {
    const cField = PROFILE_DETAIL_FIELDS.find((f) => f.group === "community") as ProfileDetailField
    expect(getRequiredFieldEditHash(cField)).toBe("#community")
  })
  it("defaults to #basics", () => {
    const basicsField = PROFILE_DETAIL_FIELDS.find((f) => f.group === "basics") as ProfileDetailField
    expect(getRequiredFieldEditHash(basicsField)).toBe("#basics")
  })
})
