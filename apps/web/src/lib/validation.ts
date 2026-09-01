import { z } from "zod"

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
  profileFor: z.string().min(1, "Choose who this profile is for."),
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
    gender: z.string().min(1, "Select a gender."),
    dobDay: z.string().regex(/^\d{2}$/, "Enter a valid day."),
    dobMonth: z.string().regex(/^\d{2}$/, "Enter a valid month."),
    dobYear: z.string().regex(/^\d{4}$/, "Enter a valid year."),
    maritalStatus: z.string().min(1, "Select marital status."),
    city: z.string().trim().min(2, "Enter your city."),
  })
  .superRefine((value, ctx) => {
    const age = dobAge(value.dobDay, value.dobMonth, value.dobYear, value.gender)
    if (!age.ok) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: age.message, path: ["dobYear"] })
    }
  })

export const signupStep3Schema = z.object({
  religion: z.string().min(1, "Select a religion."),
  caste: z.string().trim().min(2, "Enter caste or community."),
  motherTongue: z.string().min(1, "Select a mother tongue."),
})

export const signupStep5Schema = z.object({
  otp: otpSchema,
})

export const profileEditSchema = z
  .object({
    phone: z.string().refine((value) => value.length === 0 || /^[6-9]\d{9}$/.test(value), {
      message: "Enter a valid 10-digit mobile number.",
    }),
    fullName: z.string().trim().min(1, "Full name is required."),
    gender: z.string().min(1, "Gender is required."),
    dobDay: z.string().regex(/^\d{2}$/, "Date of birth is required."),
    dobMonth: z.string().regex(/^\d{2}$/, "Date of birth is required."),
    dobYear: z.string().regex(/^\d{4}$/, "Date of birth is required."),
    maritalStatus: z.string().min(1, "Marital status is required."),
    religion: z.string().min(1, "Religion is required."),
    motherTongue: z.string().min(1, "Mother tongue is required."),
    city: z.string().trim().min(2, "City is required."),
    education: z.string().optional(),
    otherEducation: z.string().optional(),
    degree: z.string().optional(),
    occupation: z.string().optional(),
    otherOccupation: z.string().optional(),
    profession: z.string().optional(),
    annualIncome: z.string().optional(),
    prefReligion: z.array(z.string()).min(1, "Select at least one preferred religion."),
    aboutMe: z.string().max(300, "Keep this under 300 characters."),
    prefAgeMin: z.number().int().min(18).max(80),
    prefAgeMax: z.number().int().min(18).max(80),
    brothersCount: z.number().int().min(0).max(5),
    sistersCount: z.number().int().min(0).max(5),
  })
  .passthrough()
  .superRefine((value, ctx) => {
    if (value.prefAgeMin > value.prefAgeMax) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Minimum age cannot be above maximum age.",
        path: ["prefAgeMin"],
      })
    }
    const age = dobAge(value.dobDay, value.dobMonth, value.dobYear, value.gender)
    if (!age.ok) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: age.message, path: ["dobYear"] })
    }
    const hasText = (v: unknown) => typeof v === "string" && v.trim().length > 0
    if (!hasText(value.education) && !hasText(value.otherEducation) && !hasText(value.degree)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Highest education is required.",
        path: ["education"],
      })
    }
    if (!hasText(value.occupation) && !hasText(value.otherOccupation) && !hasText(value.profession)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Occupation is required.",
        path: ["occupation"],
      })
    }
    if (!hasText(value.annualIncome)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Annual income is required.",
        path: ["annualIncome"],
      })
    }
    const horoscope = value as Record<string, unknown>
    if (!hasText(horoscope.birthTime)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Birth time is required.",
        path: ["birthTime"],
      })
    }
    if (!hasText(horoscope.birthPlace)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Birth place is required.",
        path: ["birthPlace"],
      })
    }
    if (!hasText(horoscope.star)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Star / nakshatra is required.",
        path: ["star"],
      })
    }
    if (!hasText(horoscope.rashi)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Rashi is required.",
        path: ["rashi"],
      })
    }
    if (!hasText(horoscope.manglik)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Manglik status is required.",
        path: ["manglik"],
      })
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
    profileFor: z.string().min(1, "Choose who this profile is for."),
    phone: phoneSchema,
    fullName: z.string().trim().min(3, "Name must be at least 3 characters."),
    gender: z.string().min(1, "Select gender."),
    dobDay: z.string().regex(/^(0[1-9]|[12]\d|3[01])$/, "Enter a valid day."),
    dobMonth: z.string().regex(/^(0[1-9]|1[0-2])$/, "Enter a valid month."),
    dobYear: z.string().regex(/^(19\d{2}|20\d{2})$/, "Enter a valid year."),
    maritalStatus: z.string().min(1, "Select marital status."),
    city: z.string().trim().min(2, "Enter city."),
    religion: z.string().min(1, "Select religion."),
    caste: z.string().trim().min(2, "Enter caste or community."),
    motherTongue: z.string().min(1, "Select mother tongue."),
    brothersCount: z.number().int().min(0).max(5),
    sistersCount: z.number().int().min(0).max(5),
    planId: z.string().optional(),
  })
  .superRefine((value, ctx) => {
    const age = dobAge(value.dobDay, value.dobMonth, value.dobYear, value.gender)
    if (!age.ok) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: age.message, path: ["dobYear"] })
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
