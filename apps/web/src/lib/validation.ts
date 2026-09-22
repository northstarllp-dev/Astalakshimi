import { z } from "zod"
import { parseHeightToCm } from "@/lib/input-units"
import { maritalAsksChildren, maritalStatusSchema, profileForSchema, genderSchema } from "@astalakshimi/validation"

export const phoneSchema = z
  .string()
  .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number.")

export const otpSchema = z.string().regex(/^\d{6}$/, "Enter the 6-digit OTP.")

export const loginPhoneSchema = z.object({
  phone: phoneSchema,
})

export const loginOtpSchema = z.object({
  otp: otpSchema,
})

export const heroRegisterSchema = z.object({
  looking: z.enum(["Bride", "Groom"]),
  age: z.coerce.number().int().min(18, "Minimum age is 18.").max(70, "Enter a valid age."),
  motherTongue: z.string().min(1, "Select a mother tongue."),
})

export const signupStep1Schema = z.object({
  profileFor: profileForSchema,
  phone: phoneSchema,
  terms: z.boolean().refine((value) => value === true, {
    message: "Accept the terms to continue.",
  }),
})

function dobAge(day: string, month: string, year: string, gender: string) {
  const dob = new Date(`${year}-${month}-${day}`)
  if (Number.isNaN(dob.getTime())) return { ok: false as const, message: "Invalid date." }
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age -= 1
  const minAge = gender === "Male" ? 21 : 18
  if (age < minAge) return { ok: false as const, message: `Must be at least ${minAge} years old.` }
  if (age > 100) return { ok: false as const, message: "Please enter a valid age." }
  return { ok: true as const, age }
}

export const signupStep2Schema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(3, "Name must be at least 3 characters.")
      .regex(/^[a-zA-Z\s]+$/, "Name can only contain letters."),
    gender: genderSchema,
    dobDay: z.string().regex(/^(0[1-9]|[12]\d|3[01])$/, "Enter a valid day."),
    dobMonth: z.string().regex(/^(0[1-9]|1[0-2])$/, "Enter a valid month."),
    dobYear: z.string().regex(/^(19\d{2}|20\d{2})$/, "Enter a valid year."),
    maritalStatus: maritalStatusSchema,
    diet: z.enum(["Vegetarian", "Non-vegetarian", "Eggetarian", "Jain", "Vegan"], {
      errorMap: () => ({ message: "Select your diet." }),
    }),
    city: z.string().trim().min(2, "Enter your city."),
    height: z.string().min(1, "Enter height."),
    hasChildren: z.boolean().optional(),
    childrenCount: z.number().int().optional(),
    childrenLivingWithMe: z.boolean().nullable().optional(),
  })
  .superRefine((value, ctx) => {
    const age = dobAge(value.dobDay, value.dobMonth, value.dobYear, value.gender)
    if (!age.ok) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: age.message, path: ["dobYear"] })
    }
    const heightCm = parseHeightToCm(value.height)
    if (!heightCm) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid height.", path: ["height"] })
    }
    if (maritalAsksChildren(value.maritalStatus)) {
      if (value.hasChildren === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please say whether there are children.",
          path: ["hasChildren"],
        })
      } else if (value.hasChildren) {
        if (!value.childrenCount || value.childrenCount < 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Enter how many children.",
            path: ["childrenCount"],
          })
        }
        if (value.childrenLivingWithMe === undefined || value.childrenLivingWithMe === null) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Please say if the children live with you.",
            path: ["childrenLivingWithMe"],
          })
        }
      }
    }
  })

export const signupStep3Schema = z.object({
  religion: z.string().min(1, "Select a religion."),
  caste: z.string().trim().min(2, "Enter caste or community."),
  motherTongue: z.string().min(1, "Select a mother tongue."),
})

// Step 5 — partner preferences. Age range + preferred religion are required
// (they drive the match engine's hard filters); the rest is optional and
// pre-filled "same as me" from the community step. The age fields stay
// structurally optional so an emptied input is representable — presence is
// enforced in the refine below.
export const signupStepPreferencesSchema = z
  .object({
    prefAgeMin: z.number().int("Enter a whole number.").min(18, "Minimum age is 18.").max(80, "Maximum age is 80.").optional(),
    prefAgeMax: z.number().int("Enter a whole number.").min(18, "Minimum age is 18.").max(80, "Maximum age is 80.").optional(),
    prefReligion: z.array(z.string()).min(1, "Select at least one preferred religion."),
    prefMaritalStatuses: z.array(z.string()).optional(),
    prefCastes: z.array(z.string()).optional(),
    prefMotherTongues: z.array(z.string()).optional(),
    prefMinEducation: z.string().optional(),
    prefLocations: z.array(z.string()).optional(),
    prefHeightMinCm: z.number().int().min(120).max(230).optional(),
    prefHeightMaxCm: z.number().int().min(120).max(230).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.prefAgeMin === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter the minimum age you're looking for.",
        path: ["prefAgeMin"],
      })
    }
    if (value.prefAgeMax === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter the maximum age you're looking for.",
        path: ["prefAgeMax"],
      })
    }
    if (value.prefAgeMin !== undefined && value.prefAgeMax !== undefined && value.prefAgeMin > value.prefAgeMax) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Minimum age cannot be above maximum age.",
        path: ["prefAgeMin"],
      })
    }
    if (
      value.prefHeightMinCm !== undefined &&
      value.prefHeightMaxCm !== undefined &&
      value.prefHeightMinCm > value.prefHeightMaxCm
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Minimum height cannot be above maximum height.",
        path: ["prefHeightMinCm"],
      })
    }
  })

export const signupStep5Schema = z.object({
  otp: otpSchema,
})

export const profileEditSchema = z
  .object({
    phone: z.string().refine((value) => value.length === 0 || /^[6-9]\d{9}$/.test(value), {
      message: "Enter a valid 10-digit mobile number.",
    }),
    fullName: z
      .string()
      .trim()
      .min(3, "Name must be at least 3 characters.")
      .max(100, "Name is too long.")
      .regex(/^[a-zA-Z\s]+$/, "Name can only contain letters."),
    profileFor: profileForSchema,
    gender: genderSchema,
    dobDay: z.string().regex(/^(0[1-9]|[12]\d|3[01])$/, "Date of birth is required."),
    dobMonth: z.string().regex(/^(0[1-9]|1[0-2])$/, "Date of birth is required."),
    dobYear: z.string().regex(/^(19\d{2}|20\d{2})$/, "Date of birth is required."),
    maritalStatus: maritalStatusSchema,
    diet: z.preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      z.enum(["Vegetarian", "Non-vegetarian", "Eggetarian", "Jain", "Vegan"]).optional(),
    ),
    smoking: z.preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      z.enum(["Never", "Occasionally", "Regularly", "Planning to quit"]).optional(),
    ),
    alcohol: z.preprocess(
      (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      z.enum(["Never", "Occasionally", "Regularly", "Planning to quit"]).optional(),
    ),
    interests: z.array(z.string().max(60)).max(7, "Select up to 7 interests.").optional(),
    religion: z.string().min(1, "Religion is required."),
    motherTongue: z.string().min(1, "Mother tongue is required."),
    city: z.string().trim().min(2, "City is required."),
    educationLevel: z.string().optional(),
    degree: z.string().optional(),
    employmentStatus: z.string().optional(),
    profession: z.string().optional(),
    annualIncome: z.string().optional(),
    prefReligion: z.array(z.string()).optional(),
    prefMaritalStatuses: z.array(z.string()).optional(),
    prefCastes: z.array(z.string()).optional(),
    prefMotherTongues: z.array(z.string()).optional(),
    prefMinEducation: z.string().optional(),
    prefLocations: z.array(z.string()).optional(),
    aboutMe: z.string().max(1000, "Keep this under 1000 characters."),
    prefAgeMin: z.number().int().min(18).max(80).optional(),
    prefAgeMax: z.number().int().min(18).max(80).optional(),
    prefHeightMinCm: z.number().int().min(120).max(230).optional(),
    prefHeightMaxCm: z.number().int().min(120).max(230).optional(),
    brothersCount: z.number().int().min(0).max(5),
    sistersCount: z.number().int().min(0).max(5),
  })
  .passthrough()
  .superRefine((value, ctx) => {
    if (value.prefAgeMin !== undefined && value.prefAgeMax !== undefined && value.prefAgeMin > value.prefAgeMax) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Minimum age cannot be above maximum age.",
        path: ["prefAgeMin"],
      })
    }
    if (
      value.prefHeightMinCm !== undefined &&
      value.prefHeightMaxCm !== undefined &&
      value.prefHeightMinCm > value.prefHeightMaxCm
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Minimum height cannot be above maximum height.",
        path: ["prefHeightMinCm"],
      })
    }
    const age = dobAge(value.dobDay, value.dobMonth, value.dobYear, value.gender)
    if (!age.ok) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: age.message, path: ["dobYear"] })
    }
    if (maritalAsksChildren(value.maritalStatus)) {
      const hasChildren = (value as { hasChildren?: boolean }).hasChildren
      if (hasChildren === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please say whether there are children.",
          path: ["hasChildren"],
        })
      } else if (hasChildren) {
        const count = (value as { childrenCount?: number }).childrenCount
        if (!count || count < 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Enter how many children.",
            path: ["childrenCount"],
          })
        }
        const living = (value as { childrenLivingWithMe?: boolean | null }).childrenLivingWithMe
        if (living === undefined || living === null) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Please say if the children live with you.",
            path: ["childrenLivingWithMe"],
          })
        }
      }
    }
  })

export const searchFiltersSchema = z
  .object({
    q: z.string(),
    city: z.string(),
    community: z.string(),
    motherTongue: z.string(),
    education: z.string(),
    income: z.string(),
    ageMin: z.number().int().min(18).max(80),
    ageMax: z.number().int().min(18).max(80),
    photoVerified: z.boolean(),
    hasHoroscope: z.boolean(),
  })
  .refine((value) => value.ageMin <= value.ageMax, {
    message: "Minimum age cannot be above maximum age.",
    path: ["ageMin"],
  })

export const discoverQuickSchema = z
  .object({
    ageMin: z.number().int().min(18).max(50),
    ageMax: z.number().int().min(18).max(50),
    city: z.string(),
    community: z.string(),
  })
  .refine((value) => value.ageMin <= value.ageMax, {
    message: "Minimum age cannot be above maximum age.",
    path: ["ageMin"],
  })

export const planSelectSchema = z.object({
  planId: z.enum(["free", "silver", "gold", "platinum", "diamond"]),
})

export const checkoutSchema = z
  .object({
    method: z.enum(["upi", "card", "netbanking", "wallet"]),
    upiId: z.string(),
    paidPlan: z.boolean(),
  })
  .superRefine((value, ctx) => {
    if (value.paidPlan && value.method === "upi" && value.upiId.trim().length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter a valid UPI ID to continue (demo).",
        path: ["upiId"],
      })
    }
  })

export const settingsListsSchema = z.object({
  hideFromUsers: z.array(z.string()),
  hideFromCities: z.array(z.string()),
})

export const adminLoginSchema = z.object({
  email: z.string().email("Enter a valid staff email."),
  password: z.string().min(6, "Password must be at least 6 characters."),
})

export const adminRejectSchema = z.object({
  rejectionReason: z
    .string()
    .trim()
    .min(10, "Provide a clear rejection reason (at least 10 characters)."),
})

export const adminCreateProfileSchema = z
  .object({
    profileFor: profileForSchema,
    phone: phoneSchema,
    fullName: z.string().trim().min(3, "Name must be at least 3 characters."),
    gender: genderSchema,
    dobDay: z.string().regex(/^(0[1-9]|[12]\d|3[01])$/, "Enter a valid day."),
    dobMonth: z.string().regex(/^(0[1-9]|1[0-2])$/, "Enter a valid month."),
    dobYear: z.string().regex(/^(19\d{2}|20\d{2})$/, "Enter a valid year."),
    maritalStatus: maritalStatusSchema,
    hasChildren: z.boolean().optional(),
    childrenCount: z.number().int().optional(),
    childrenLivingWithMe: z.boolean().nullable().optional(),
    height: z.string().min(1, "Enter height."),
    diet: z.enum(["Vegetarian", "Non-vegetarian", "Eggetarian", "Jain", "Vegan"]).optional(),
    city: z.string().trim().min(2, "Enter city."),
    state: z.string().trim().min(2).max(100).optional(),
    religion: z.string().min(1, "Select religion."),
    caste: z.string().trim().min(2, "Enter caste or community."),
    motherTongue: z.string().min(1, "Select mother tongue."),
    educationLevel: z.string().min(1, "Select education level."),
    employmentStatus: z.string().min(1, "Select employment status."),
    annualIncome: z.string().min(1, "Select annual income."),
    brothersCount: z.number().int().min(0).max(5),
    sistersCount: z.number().int().min(0).max(5),
    aboutMe: z.string().max(1000).optional(),
    planId: z.string().optional(),
    prefAgeMin: z.number().int().min(18).max(80),
    prefAgeMax: z.number().int().min(18).max(80),
    prefHeightMinCm: z.number().int().min(120).max(230).optional(),
    prefHeightMaxCm: z.number().int().min(120).max(230).optional(),
    prefMaritalStatuses: z.array(z.string()).min(1, "Select preferred marital statuses."),
    prefReligions: z.array(z.string()).min(1, "Select preferred religions."),
    prefCastes: z.array(z.string()).optional(),
    prefMotherTongues: z.array(z.string()).optional(),
    prefLocations: z.array(z.string()).optional(),
    prefAcceptableIncomes: z.array(z.string()).optional(),
  })
  .superRefine((value, ctx) => {
    const age = dobAge(value.dobDay, value.dobMonth, value.dobYear, value.gender)
    if (!age.ok) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: age.message, path: ["dobYear"] })
    }
    const heightCm = parseHeightToCm(value.height)
    if (!heightCm) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a valid height.", path: ["height"] })
    }
    if (maritalAsksChildren(value.maritalStatus)) {
      if (value.hasChildren === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please say whether there are children.",
          path: ["hasChildren"],
        })
      } else if (value.hasChildren) {
        if (!value.childrenCount || value.childrenCount < 1) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Enter how many children.",
            path: ["childrenCount"],
          })
        }
        if (value.childrenLivingWithMe === undefined || value.childrenLivingWithMe === null) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Please say if the children live with you.",
            path: ["childrenLivingWithMe"],
          })
        }
      }
    }
    if (value.prefAgeMin !== undefined && value.prefAgeMax !== undefined && value.prefAgeMin > value.prefAgeMax) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Minimum age cannot be above maximum age.",
        path: ["prefAgeMin"],
      })
    }
    if (
      value.prefHeightMinCm !== undefined &&
      value.prefHeightMaxCm !== undefined &&
      value.prefHeightMinCm > value.prefHeightMaxCm
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Minimum height cannot be above maximum height.",
        path: ["prefHeightMinCm"],
      })
    }
  })

export type LoginPhoneValues = z.infer<typeof loginPhoneSchema>
export type LoginOtpValues = z.infer<typeof loginOtpSchema>
export type HeroRegisterValues = z.infer<typeof heroRegisterSchema>
export type SignupStep1Values = z.infer<typeof signupStep1Schema>
export type SearchFiltersValues = z.infer<typeof searchFiltersSchema>
export type CheckoutValues = z.infer<typeof checkoutSchema>
export type PlanSelectValues = z.infer<typeof planSelectSchema>
export type AdminLoginValues = z.infer<typeof adminLoginSchema>
export type AdminRejectValues = z.infer<typeof adminRejectSchema>
export type AdminCreateProfileValues = z.infer<typeof adminCreateProfileSchema>
