"use client"

import * as React from "react"
import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Logo } from "@/components/ui/logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, ChevronRight, Loader2, UserRound } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import { getMediaUrl } from "@/lib/utils"
import {
  emptySignupData,
  formatSiblings,
  SIBLING_COUNTS,
  RELIGIONS,
  MOTHER_TONGUES,
  MARITAL_STATUSES,
  DIETS,
  EDUCATION_LEVELS,
  FAMILY_TYPES,
  FAMILY_STATUS,
  FAMILY_VALUES,
  PARENT_OCCUPATIONS,
  loadSignupDraft,
  saveSignupDraft,
  clearSignupDraft,
  seedPreferenceDefaults,
  SIGNUP_TOTAL_STEPS,
  type SignupData,
} from "@/lib/profile-store"
import { StepHeading, StepProgress, TapCard } from "@/components/signup/shared"
import { CityAutocomplete, CityMultiSelect } from "@/components/profile/city-autocomplete"
import { CommunityFields } from "@/components/profile/community-fields"
import { HeightCmInput, HeightInput } from "@/components/profile/input-with-unit"
import { ChildrenFields } from "@/components/profile/children-fields"
import { MultiSelect } from "@/components/profile/multi-select"
import { SearchableSelect } from "@/components/profile/searchable-select"
import { Step4Verify, VerificationSubmitted } from "@/components/signup/step-verify"
import { useSaveProfileMutation } from "@/hooks/queries"
import {
  signupStep1Schema,
  signupStep2Schema,
  signupStep3Schema,
  signupStep5Schema,
  signupStepPreferencesSchema,
} from "@/lib/validation"
import { getCommunities } from "@astalakshimi/reference"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

function directPreview(value: string | undefined) {
  if (!value) return ""
  return value.startsWith("blob:") || value.startsWith("data:image/") ? value : ""
}

const TOTAL_STEPS = SIGNUP_TOTAL_STEPS
const REFERRED_BY_KEY = "astalakshimi.referredBy"

function SignupPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const presetPhone = (searchParams.get("phone") ?? "").replace(/\D/g, "").slice(0, 10)
  const fromLogin = searchParams.get("new") === "1"
  const [hydrated, setHydrated] = useState(false)
  const [step, setStep] = useState(1)
  const [submitted, setSubmitted] = useState(false)
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [data, setData] = useState<SignupData>(emptySignupData)
  const saveProfileMutation = useSaveProfileMutation()

  React.useEffect(() => {
    const draft = loadSignupDraft()
    if (draft?.data.submittedAt) {
      clearSignupDraft()
      void (async () => {
        try {
          await apiClient.auth.syncEnrollment()
        } catch {
          /* still try home; middleware will bounce if incomplete */
        }
        router.replace("/home")
      })()
      return
    }
    if (draft) {
      const draftPhone = String(draft.data.phone ?? "").replace(/\D/g, "").slice(0, 10)
      if (fromLogin && presetPhone && draftPhone && draftPhone !== presetPhone) {
        setData({ ...emptySignupData(), phone: presetPhone })
        setStep(1)
      } else {
        const restored: SignupData = {
          ...draft.data,
          phone: presetPhone || draft.data.phone,
          photos: (draft.data.photoS3Keys?.length
            ? draft.data.photoS3Keys
            : draft.data.photos
          )
            .filter(Boolean)
            .map((path) => getMediaUrl(path)),
          selfiePhoto: directPreview(draft.data.selfiePhoto),
          govtIdPhoto: directPreview(draft.data.govtIdPhoto),
        }
        // Seed the "same as me" preference pre-fills when resuming into (or
        // past) the preferences step, so step 5 opens pre-filled and the draft
        // carries them even if the member changes nothing.
        setData({ ...restored, ...seedPreferenceDefaults(restored) })
        // OTP is verified iff the auth token is present; skip the phone/OTP
        // steps when authenticated, otherwise restart at phone entry.
        setStep(apiClient.getToken() ? Math.max(draft.step, 3) : 1)
      }
    } else if (presetPhone) {
      setData({ ...emptySignupData(), phone: presetPhone })
    }
    setHydrated(true)
  }, [router, presetPhone, fromLogin])

  // Heal: already-enrolled users (or missing has_profile cookie) shouldn't stay on onboarding.
  React.useEffect(() => {
    if (!hydrated || submitted) return
    let cancelled = false
    ;(async () => {
      try {
        const me = await apiClient.auth.getMe()
        if (cancelled) return
        if (me.hasProfile) {
          await apiClient.auth.syncEnrollment()
          router.replace("/home")
        }
      } catch {
        /* not logged in yet — stay on register */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hydrated, submitted, router])

  React.useEffect(() => {
    const ref = searchParams.get("ref")
    if (ref && typeof window !== "undefined") {
      sessionStorage.setItem(REFERRED_BY_KEY, ref)
      setData((prev) => (prev.referredBy === ref ? prev : { ...prev, referredBy: ref }))
    }
  }, [searchParams])

  React.useEffect(() => {
    if (!hydrated || submitted) return
    saveSignupDraft(data, step)
  }, [data, step, hydrated, submitted])

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" })
    }
  }, [step, submitted])

  const updateData = (fields: Partial<SignupData>) => {
    setData((prev) => ({ ...prev, ...fields }))
  }

  const nextStep = () => {
    const target = Math.min(step + 1, TOTAL_STEPS)
    // Entering the preferences step: seed the "same as me" pre-fills from the
    // community answers in the same update, so the step renders pre-filled.
    if (target === 5) {
      setData((prev) => ({ ...prev, ...seedPreferenceDefaults(prev) }))
    }
    setStep(target)
  }
  const prevStep = () => {
    if (submitted) {
      setSubmitted(false)
      return
    }
    if (step > 1) setStep((prev) => prev - 1)
  }

  // Step 2: verify OTP up front, before any profile details are collected.
  const verifyOtpAndContinue = async (enteredOtp: string) => {
    if (!enteredOtp) {
      throw new Error('Enter the OTP sent to your phone.')
    }
    setVerifyingOtp(true)
    try {
      const auth = await apiClient.auth.verifyOtp({ phone: data.phone, otp: enteredOtp })
      if (auth.accessToken) {
        apiClient.setToken(auth.accessToken)
      }
      updateData({ otp: enteredOtp })
      nextStep()
    } catch (err: any) {
      throw new Error(err.message || 'Invalid OTP. Please check and try again.')
    } finally {
      setVerifyingOtp(false)
    }
  }

  // Final step: submit the completed profile. OTP was already verified at step 2,
  // so the auth token is set and complete-registration runs without re-verifying.
  const submitRegistration = async () => {
    const payload: SignupData = {
      ...data,
      siblings: formatSiblings(data.brothersCount, data.sistersCount),
      verificationStatus: 'idle',
      submittedAt: new Date().toISOString(),
    }
    try {
      await saveProfileMutation.mutateAsync(payload)
      clearSignupDraft()
      setSubmitted(true)
    } catch (err: any) {
      console.error("Submission failed:", err)
      if (typeof window !== "undefined") {
        alert(
          err.message || 
          "Your profile is missing newly required details (e.g. diet or children info). We will take you back to fill them out."
        )
        window.location.reload()
      }
    }
  }

  if (!hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background text-sm text-muted-foreground">
        Restoring your progress…
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background kolam-surface">
      <header className="sticky top-0 z-50 bg-[#fffdf8]/96 backdrop-blur-xl safe-top">
        <div className="gold-rule" />
        <div className="mx-auto flex h-16 max-w-xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            {(step > 1 || submitted) && (
              <button
                type="button"
                onClick={prevStep}
                className="tap-target inline-flex items-center justify-center rounded-full border border-secondary/20 bg-card text-muted-foreground hover:text-primary hover:border-primary/30 transition-all"
                aria-label="Go back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <Logo href={null} />
          </div>
          {!submitted && <StepProgress step={step} total={TOTAL_STEPS} />}
        </div>
        {!submitted && (
          <div className="h-1 bg-muted">
            <div
              className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
              style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        )}
        <div className="h-px bg-gradient-to-r from-transparent via-secondary/20 to-transparent" />
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col px-4 py-8 md:py-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={submitted ? "done" : step}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.22 }}
            className="flex w-full flex-1 flex-col"
          >
            {submitted ? (
              <VerificationSubmitted onContinue={() => router.push("/home")} />
            ) : (
              <>
                {step === 1 && (
                  <Step1AccountCreation
                    data={data}
                    updateData={updateData}
                    nextStep={nextStep}
                    newAccountHint={fromLogin}
                  />
                )}
                {step === 2 && (
                  <Step5OTP
                    data={data}
                    updateData={updateData}
                    onSubmit={verifyOtpAndContinue}
                    isSubmitting={verifyingOtp}
                  />
                )}
                {step === 3 && <Step2Identity data={data} updateData={updateData} nextStep={nextStep} />}
                {step === 4 && <Step3Community data={data} updateData={updateData} nextStep={nextStep} />}
                {step === 5 && (
                  <Step6Preferences data={data} updateData={updateData} nextStep={nextStep} />
                )}
                {step === 6 && (
                  <Step4Verify
                    data={data}
                    updateData={updateData}
                    onSubmit={submitRegistration}
                    isSubmitting={saveProfileMutation.isPending}
                  />
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  )
}

export default function SignupPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-background text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <SignupPageInner />
    </React.Suspense>
  )
}

// ─── Step 1: Account Creation ────────────────────────────────────────────────

function Step1AccountCreation({
  data,
  updateData,
  nextStep,
  newAccountHint = false,
}: {
  data: SignupData
  updateData: (fields: Partial<SignupData>) => void
  nextStep: () => void
  newAccountHint?: boolean
}) {
  const [loading, setLoading] = useState(false)
  const form = useForm({
    resolver: zodResolver(signupStep1Schema) as any,
    // Consent is wizard state, not just form state: restore the member's
    // earlier choice when they come back (OTP step, reload), instead of
    // silently unchecking the box they already ticked.
    defaultValues: { profileFor: data.profileFor, phone: data.phone, terms: data.consentAccepted === true },
    mode: "onChange",
  })
  const profileFor = form.watch("profileFor")
  const step1Phone = form.watch("phone") ?? ""
  const loginHref =
    step1Phone.replace(/\D/g, "").length === 10
      ? `/login?phone=${encodeURIComponent(step1Phone.replace(/\D/g, ""))}`
      : "/login"

  const profileOptions = [
    { id: "Myself", icon: "👤" },
    { id: "Son", icon: "👦" },
    { id: "Daughter", icon: "👧" },
    { id: "Brother", icon: "🧑" },
    { id: "Sister", icon: "👩" },
    { id: "Relative", icon: "👥" },
  ]

  const router = useRouter()
  const onStep1Submit = async (values: any) => {
    setLoading(true)
    updateData({ profileFor: values.profileFor, phone: values.phone, consentAccepted: true })
    try {
      await apiClient.auth.sendOtp({ phone: values.phone, consentAccepted: true, type: "register" })
      nextStep()
    } catch (err: any) {
      console.warn("sendOtp error:", err)
      if (err.message && err.message.toLowerCase().includes("already registered")) {
        const phone = String(values.phone ?? "").replace(/\D/g, "").slice(0, 10)
        router.push(phone ? `/login?phone=${encodeURIComponent(phone)}&existing=1` : "/login")
      } else {
        form.setError("phone", { message: err.message || "Failed to send OTP. Please try again." })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      className="flex flex-col flex-1 min-h-[calc(100vh-140px)] md:min-h-0 space-y-8"
      onSubmit={form.handleSubmit(onStep1Submit)}
    >
      <StepHeading
        title="Create your account"
        subtitle="Who is this profile for? Enter your mobile  we'll send an OTP after you've set up the profile."
      />
      {newAccountHint && data.phone ? (
        <p className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-medium text-primary">
          This number isn&apos;t registered yet. Create a free account to continue.
        </p>
      ) : null}

      {/* Profile for */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">Profile for</Label>
        <div className="grid grid-cols-3 gap-2.5">
          {profileOptions.map((opt) => (
            <TapCard
              key={opt.id}
              selected={profileFor === opt.id}
              onClick={() => {
                let autoGender = data.gender
                if (opt.id === "Son" || opt.id === "Brother") autoGender = "Male"
                if (opt.id === "Daughter" || opt.id === "Sister") autoGender = "Female"
                form.setValue("profileFor", opt.id, { shouldValidate: true })
                updateData({ profileFor: opt.id, gender: autoGender })
              }}
              title={opt.id}
              icon={opt.icon}
            />
          ))}
        </div>
        {form.formState.errors.profileFor && (
          <p className="text-xs text-destructive">{form.formState.errors.profileFor.message}</p>
        )}
      </div>

      {/* Mobile */}
          <div className="space-y-2">
            <Label htmlFor="phone">Mobile number</Label>
            <div className="flex">
              <span className="inline-flex items-center rounded-l-xl border border-r-0 border-input bg-muted px-4 text-sm text-muted-foreground">
                +91
              </span>
              <Input
                id="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="98765 43210"
                className="rounded-l-none text-lg"
                maxLength={10}
            {...form.register("phone", {
              onChange: (event) => {
                const next = event.target.value.replace(/\D/g, "")
                event.target.value = next
                updateData({ phone: next })
              },
            })}
              />
            </div>
        {form.formState.errors.phone && (
          <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>
        )}
          </div>

      {/* Consent */}
      <label className="flex items-start gap-3 text-xs leading-relaxed text-muted-foreground cursor-pointer">
        <input type="checkbox" className="mt-0.5 h-4 w-4 accent-primary" {...form.register("terms")} />
        By continuing, you agree to our Terms of Service and Privacy Policy. Profiles are screened
        before they go live.
          </label>
      {form.formState.errors.terms && (
        <p className="text-xs text-destructive">{form.formState.errors.terms.message}</p>
      )}

      <div className="mt-auto space-y-4 pt-4">
        <Button className="w-full" size="lg" type="submit" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Continuing…
            </>
          ) : (
            <>
              Continue <ChevronRight className="ml-1 h-5 w-5" />
            </>
          )}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already a member?{" "}
              <Link href={loginHref} className="font-semibold text-primary">
                Login
              </Link>
            </p>
          </div>
    </form>
  )
}

// ─── DOB helper ─────────────────────────────────────────────────────────────

function DobFields({
  day,
  month,
  year,
  onChange,
}: {
  day: string
  month: string
  year: string
  onChange: (fields: Partial<SignupData>) => void
}) {
  const dayRef = React.useRef<HTMLInputElement>(null)
  const monthRef = React.useRef<HTMLInputElement>(null)
  const yearRef = React.useRef<HTMLInputElement>(null)

  const handleChange = (
    field: "dobDay" | "dobMonth" | "dobYear",
    value: string,
    maxLen: number,
    next?: React.RefObject<HTMLInputElement | null>
  ) => {
    const digits = value.replace(/\D/g, "").slice(0, maxLen)
    onChange({ [field]: digits })
    if (digits.length === maxLen && next?.current) {
      next.current.focus()
      next.current.select()
    }
  }

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    value: string,
    prev?: React.RefObject<HTMLInputElement | null>
  ) => {
    if (e.key === "Backspace" && value.length === 0 && prev?.current) {
      e.preventDefault()
      prev.current.focus()
      const len = prev.current.value.length
      prev.current.setSelectionRange(len, len)
    }
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      <Input
        ref={dayRef}
        placeholder="DD"
        inputMode="numeric"
        maxLength={2}
        value={day}
        aria-label="Day"
        className="text-center"
        onChange={(e) => handleChange("dobDay", e.target.value, 2, monthRef)}
        onKeyDown={(e) => handleKeyDown(e, day)}
      />
      <Input
        ref={monthRef}
        placeholder="MM"
        inputMode="numeric"
        maxLength={2}
        value={month}
        aria-label="Month"
        className="text-center"
        onChange={(e) => handleChange("dobMonth", e.target.value, 2, yearRef)}
        onKeyDown={(e) => handleKeyDown(e, month, dayRef)}
      />
      <Input
        ref={yearRef}
        placeholder="YYYY"
        inputMode="numeric"
        maxLength={4}
        value={year}
        aria-label="Year"
        className="text-center"
        onChange={(e) => handleChange("dobYear", e.target.value, 4)}
        onKeyDown={(e) => handleKeyDown(e, year, monthRef)}
      />
    </div>
  )
}

// Returns "His " / "Her " / "" based on profileFor + gender
function genderPrefix(profileFor: string, gender: string): string {
  if (!profileFor || profileFor === "Myself") return ""
  if (gender === "Male") return "His "
  if (gender === "Female") return "Her "
  return "Their "
}

// ─── Step 2: Identity ────────────────────────────────────────────────────────

function Step2Identity({
  data,
  updateData,
  nextStep,
}: {
  data: SignupData
  updateData: (fields: Partial<SignupData>) => void
  nextStep: () => void
}) {
  const p = genderPrefix(data.profileFor, data.gender)
  const form = useForm({
    resolver: zodResolver(signupStep2Schema) as any,
    values: {
      fullName: data.fullName,
      gender: data.gender,
      dobDay: data.dobDay,
      dobMonth: data.dobMonth,
      dobYear: data.dobYear,
      maritalStatus: data.maritalStatus,
      diet: data.diet,
      city: data.city,
      height: data.height,
      hasChildren: data.hasChildren,
      childrenCount: data.childrenCount,
      childrenLivingWithMe: data.childrenLivingWithMe,
    },
    mode: "onChange",
  })
  const errors = form.formState.errors

  return (
    <form className="space-y-8" onSubmit={form.handleSubmit(() => nextStep())}>
      <StepHeading
        title="Identity"
        subtitle="Tell us about the person looking for a match. Fields marked * are required."
      />

      <div className="space-y-5">
        {/* Name */}
          <div className="space-y-2">
          <Label htmlFor="fullName">
            {p}Full name
            <span className="ml-0.5 text-destructive" aria-hidden="true">
              *
            </span>
          </Label>
            <Input
              id="fullName"
              placeholder="e.g. Priya Sharma"
              autoComplete="name"
              value={data.fullName}
              onChange={(e) => updateData({ fullName: e.target.value })}
            />
          {errors.fullName && (
            <p className="text-xs text-destructive">{errors.fullName.message}</p>
            )}
          </div>

        {/* Gender */}
          <div className="space-y-2">
          <Label>
            Gender
            <span className="ml-0.5 text-destructive" aria-hidden="true">
              *
            </span>
          </Label>
            <div className="grid grid-cols-3 gap-2.5">
              {["Male", "Female", "Other"].map((g) => (
                <TapCard key={g} selected={data.gender === g} onClick={() => updateData({ gender: g })} title={g} />
              ))}
            </div>
          </div>

        {/* DOB */}
          <div className="space-y-2">
          <Label>
            {p}Date of birth
            <span className="ml-0.5 text-destructive" aria-hidden="true">
              *
            </span>
          </Label>
            <DobFields
              day={data.dobDay}
              month={data.dobMonth}
              year={data.dobYear}
              onChange={updateData}
            />
          {errors.dobYear && <p className="text-xs text-destructive">{errors.dobYear.message}</p>}
          {errors.gender && <p className="text-xs text-destructive">{errors.gender.message}</p>}
          </div>

        {/* Marital status */}
          <div className="space-y-2">
          <Label>
            {p}Marital status
            <span className="ml-0.5 text-destructive" aria-hidden="true">
              *
            </span>
          </Label>
          <Select
            value={data.maritalStatus || undefined}
            onValueChange={(maritalStatus) =>
              updateData({
                maritalStatus,
                ...(maritalStatus === "Divorced" || maritalStatus === "Widowed"
                  ? {}
                  : { hasChildren: false, childrenCount: 0, childrenLivingWithMe: null }),
              })
            }
          >
            <SelectTrigger className="w-full" aria-label="Marital status">
              <SelectValue placeholder="Select marital status" />
            </SelectTrigger>
            <SelectContent>
              {MARITAL_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          </div>

        {/* Diet */}
        <div className="space-y-2">
          <Label>
            {p}Diet
            <span className="ml-0.5 text-destructive" aria-hidden="true">
              *
            </span>
          </Label>
          <Select
            value={data.diet || undefined}
            onValueChange={(diet) => updateData({ diet })}
          >
            <SelectTrigger className="w-full" aria-label="Diet">
              <SelectValue placeholder="Select diet" />
            </SelectTrigger>
            <SelectContent>
              {DIETS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.diet && <p className="text-xs text-destructive">{errors.diet.message}</p>}
        </div>

        <div className="space-y-2">
          <Label>
            {p}Height
            <span className="ml-0.5 text-destructive" aria-hidden="true">
              *
            </span>
          </Label>
          <HeightInput value={data.height} onChange={(height) => updateData({ height })} />
          {errors.height && <p className="text-xs text-destructive">{errors.height.message}</p>}
        </div>

        <ChildrenFields
          maritalStatus={data.maritalStatus}
          hasChildren={data.hasChildren}
          childrenCount={data.childrenCount}
          childrenLivingWithMe={data.childrenLivingWithMe}
          prefix={p}
          errors={{
            hasChildren: errors.hasChildren?.message,
            childrenCount: errors.childrenCount?.message,
            childrenLivingWithMe: errors.childrenLivingWithMe?.message,
          }}
          onChange={(next) => updateData(next)}
        />

        {/* Location */}
        <div className="space-y-2">
          <Label htmlFor="city">
            {p}Current city
            <span className="ml-0.5 text-destructive" aria-hidden="true">
              *
            </span>
          </Label>
          <CityAutocomplete
            city={data.city}
            state={data.state}
            citySlug={data.citySlug}
            onCityChange={({ city, state, citySlug }) =>
              updateData({ city, state, citySlug: citySlug ?? "" })
            }
            placeholder="Search city…"
          />
          {errors.city && <p className="text-xs text-destructive">{errors.city.message}</p>}
        </div>
      </div>

      <Button className="w-full" size="lg" type="submit">
        Continue <ChevronRight className="ml-1 h-5 w-5" />
      </Button>
    </form>
  )
}

// ─── Step 3: Community & Background ─────────────────────────────────────────

function Step3Community({
  data,
  updateData,
  nextStep,
}: {
  data: SignupData
  updateData: (fields: Partial<SignupData>) => void
  nextStep: () => void
}) {
  const p = genderPrefix(data.profileFor, data.gender)
  const form = useForm({
    resolver: zodResolver(signupStep3Schema),
    values: {
      religion: data.religion,
      caste: data.caste,
      motherTongue: data.motherTongue,
    },
    mode: "onChange",
  })
  const errors = form.formState.errors

  const setSiblings = (brothersCount: number, sistersCount: number) => {
    updateData({
      brothersCount,
      sistersCount,
      siblings: formatSiblings(brothersCount, sistersCount),
    })
  }

  return (
    <form className="space-y-8" onSubmit={form.handleSubmit(() => nextStep())}>
      <StepHeading
        title="Community & background"
        subtitle="These details help families find the right match. Fields marked * are required."
      />

      <div className="space-y-5">
        {/* Religion */}
        <div className="space-y-2">
          <Label htmlFor="religion">
            {p}Religion / community
            <span className="ml-0.5 text-destructive" aria-hidden="true">
              *
            </span>
          </Label>
          <Select
            value={data.religion || undefined}
            onValueChange={(religion) =>
              updateData({
                religion,
                caste: "",
                communitySlug: "",
                subcaste: "",
                gotra: "",
              })
            }
          >
            <SelectTrigger id="religion" className="w-full">
              <SelectValue placeholder="Select religion" />
            </SelectTrigger>
            <SelectContent>
              {RELIGIONS.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.religion && <p className="text-xs text-destructive">{errors.religion.message}</p>}
        </div>
        <div className="space-y-2">
          <Label>
            {p}Caste / community
            <span className="ml-0.5 text-destructive" aria-hidden="true">
              *
            </span>
          </Label>
          <CommunityFields
            religion={data.religion}
            caste={data.caste}
            communitySlug={data.communitySlug}
            subcaste={data.subcaste}
            gotra={data.gotra}
            onChange={(value) => updateData(value)}
          />
          {errors.caste && <p className="text-xs text-destructive">{errors.caste.message}</p>}
        </div>

        {/* Mother tongue */}
        <div className="space-y-2">
          <Label htmlFor="tongue">
            {p}Mother tongue
            <span className="ml-0.5 text-destructive" aria-hidden="true">
              *
            </span>
          </Label>
          <Select
            value={data.motherTongue || undefined}
            onValueChange={(motherTongue) => updateData({ motherTongue })}
          >
            <SelectTrigger id="tongue" className="w-full">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {MOTHER_TONGUES.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Family details */}
        <div className="space-y-4 rounded-2xl border border-border bg-muted/40 p-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Family details</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Optional — brothers, sisters, and family background used by families to assess compatibility.
            </p>
          </div>

          {/* Family type */}
        <div className="space-y-2">
            <Label htmlFor="familyType">{p}Family type</Label>
            <Select
              value={data.familyType || undefined}
              onValueChange={(familyType) => updateData({ familyType })}
            >
              <SelectTrigger id="familyType" className="w-full bg-card">
                <SelectValue placeholder="Select family type" />
              </SelectTrigger>
              <SelectContent>
                {FAMILY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
        </div>

          {/* Family status */}
        <div className="space-y-2">
            <Label htmlFor="familyStatus">{p}Family status</Label>
            <Select
              value={data.familyStatus || undefined}
              onValueChange={(familyStatus) => updateData({ familyStatus })}
            >
              <SelectTrigger id="familyStatus" className="w-full bg-card">
                <SelectValue placeholder="Select family status" />
              </SelectTrigger>
              <SelectContent>
                {FAMILY_STATUS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
        </div>

          {/* Family values */}
        <div className="space-y-2">
            <Label htmlFor="familyValues">{p}Family values</Label>
            <Select
              value={data.familyValues || undefined}
              onValueChange={(familyValues) => updateData({ familyValues })}
            >
              <SelectTrigger id="familyValues" className="w-full bg-card">
                <SelectValue placeholder="Select family values" />
              </SelectTrigger>
              <SelectContent>
                {FAMILY_VALUES.map((v) => (
                  <SelectItem key={v} value={v}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="fatherOccupation">{p}Father&apos;s occupation</Label>
            <Select
              value={data.fatherOccupation || undefined}
              onValueChange={(fatherOccupation) => updateData({ fatherOccupation })}
            >
              <SelectTrigger id="fatherOccupation" className="w-full bg-card">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {PARENT_OCCUPATIONS.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="motherOccupation">{p}Mother&apos;s occupation</Label>
            <Select
              value={data.motherOccupation || undefined}
              onValueChange={(motherOccupation) => updateData({ motherOccupation })}
            >
              <SelectTrigger id="motherOccupation" className="w-full bg-card">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {PARENT_OCCUPATIONS.map((o) => (
                  <SelectItem key={o} value={o}>
                    {o}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

          {/* Siblings */}
            <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Siblings</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="brothers">{p}Brothers</Label>
                <Select
                  value={String(data.brothersCount)}
                  onValueChange={(v) => setSiblings(Number(v), data.sistersCount)}
                >
                  <SelectTrigger id="brothers" className="w-full bg-card">
                    <SelectValue placeholder="Brothers" />
                  </SelectTrigger>
                  <SelectContent>
                    {SIBLING_COUNTS.map((n: any) => (
                      <SelectItem key={n} value={String(n)}>
                        {n === 5 ? "5+" : String(n)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
            </div>
              <div className="space-y-1.5">
                <Label htmlFor="sisters">{p}Sisters</Label>
                <Select
                  value={String(data.sistersCount)}
                  onValueChange={(v) => setSiblings(data.brothersCount, Number(v))}
                >
                  <SelectTrigger id="sisters" className="w-full bg-card">
                    <SelectValue placeholder="Sisters" />
                  </SelectTrigger>
                  <SelectContent>
                    {SIBLING_COUNTS.map((n: any) => (
                      <SelectItem key={n} value={String(n)}>
                        {n === 5 ? "5+" : String(n)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-sm font-medium text-primary">
              {formatSiblings(data.brothersCount, data.sistersCount)}
            </p>
          </div>
        </div>
      </div>

      <Button className="w-full" size="lg" type="submit">
        Continue <ChevronRight className="ml-1 h-5 w-5" />
      </Button>
    </form>
  )
}

// ─── Step 5: Partner Preferences ─────────────────────────────────────────────

function Step6Preferences({
  data,
  updateData,
  nextStep,
}: {
  data: SignupData
  updateData: (fields: Partial<SignupData>) => void
  nextStep: () => void
}) {
  // Pre-fills are seeded by the wizard before this step renders (see
  // seedPreferenceDefaults) — the step itself is purely controlled state, so a
  // member clearing a field can't be overwritten by a late effect.
  const communityOptions = React.useMemo(() => {
    try {
      return Array.from(new Set(getCommunities().map((c) => c.label))).sort((a, b) =>
        a.localeCompare(b),
      )
    } catch {
      return [] as string[]
    }
  }, [])

  const form = useForm({
    resolver: zodResolver(signupStepPreferencesSchema),
    values: {
      prefAgeMin: data.prefAgeMin,
      prefAgeMax: data.prefAgeMax,
      prefReligion: data.prefReligion ?? [],
      prefMaritalStatuses: data.prefMaritalStatuses ?? [],
      prefCastes: data.prefCastes ?? [],
      prefMotherTongues: data.prefMotherTongues ?? [],
      prefMinEducation: data.prefMinEducation ?? "",
      prefLocations: data.prefLocations ?? [],
      prefHeightMinCm: data.prefHeightMinCm,
      prefHeightMaxCm: data.prefHeightMaxCm,
    },
    mode: "onTouched",
  })
  const errors = form.formState.errors
  const [copiedFromProfile, setCopiedFromProfile] = React.useState(false)

  const copyFromMyProfile = () => {
    updateData({
      ...(data.religion ? { prefReligion: [data.religion] } : {}),
      ...(data.maritalStatus ? { prefMaritalStatuses: [data.maritalStatus] } : {}),
      ...(data.caste ? { prefCastes: [data.caste] } : {}),
      ...(data.motherTongue ? { prefMotherTongues: [data.motherTongue] } : {}),
      ...(data.city ? { prefLocations: [data.city] } : {}),
    })
    setCopiedFromProfile(true)
  }

  const onContinue = form.handleSubmit(() => nextStep())

  return (
    <form className="space-y-8" onSubmit={onContinue}>
      <StepHeading
        title="Who are you looking for?"
        subtitle="Required fields decide who can appear. Everything else only changes the order. You can edit this later from your profile."
      />

      <section
        className="rounded-2xl border border-secondary/30 bg-[#fff8ef] px-4 py-3.5 text-sm leading-relaxed text-foreground/90"
        aria-label="How matching works"
      >
        <p className="font-semibold text-foreground">How matching works</p>
        <ul className="mt-2 space-y-1.5 text-[13px] text-foreground/80">
          <li>
            <span className="font-semibold text-foreground">Must match.</span> Age, religion, and
            marital status. We also show the opposite gender. Anyone outside these is hidden.
          </li>
          <li>
            <span className="font-semibold text-foreground">Ranks higher.</span> Community, mother
            tongue, education, city, and height. Leave a field open and nobody is excluded for that
            reason.
          </li>
        </ul>
      </section>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Copy from my profile</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Sets religion, marital status, community, mother tongue, and city to yours. It does
              not change age, education, or height.
            </p>
          </div>
          <button
            type="button"
            onClick={copyFromMyProfile}
            className="tap-target inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-secondary/40 bg-[#fff8ef] px-4 text-xs font-semibold text-primary transition-colors hover:border-primary/40 hover:bg-muted"
          >
            <UserRound className="h-3.5 w-3.5" aria-hidden="true" />
            Copy my details
          </button>
        </div>
        {copiedFromProfile && (
          <p className="mt-2 text-xs font-medium text-primary" role="status">
            Copied. Change any field if you want something different.
          </p>
        )}
      </div>

      <div className="space-y-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Required — these filter who you see
        </p>

        {/* Age range — required (hard filter) */}
        <div className="space-y-2">
          <Label>Preferred age range *</Label>
          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              min={18}
              max={80}
              inputMode="numeric"
              aria-label="Preferred minimum age"
              value={data.prefAgeMin ?? ""}
              onChange={(e) =>
                updateData({
                  prefAgeMin: e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
              placeholder="Min"
            />
            <Input
              type="number"
              min={18}
              max={80}
              inputMode="numeric"
              aria-label="Preferred maximum age"
              value={data.prefAgeMax ?? ""}
              onChange={(e) =>
                updateData({
                  prefAgeMax: e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
              placeholder="Max"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            A starting range around your age. Change either number — it is not copied from your profile.
          </p>
          {(errors.prefAgeMin || errors.prefAgeMax) && (
            <p className="text-xs text-destructive">
              {errors.prefAgeMin?.message || errors.prefAgeMax?.message}
            </p>
          )}
        </div>

        {/* Preferred religions — required (hard filter) */}
        <div className="space-y-2">
          <Label>Preferred religion *</Label>
          <MultiSelect
            values={data.prefReligion ?? []}
            onValuesChange={(values) => updateData({ prefReligion: values })}
            options={RELIGIONS}
            placeholder="Select religions"
            searchPlaceholder="Search religions…"
            ariaLabel="Preferred religion"
          />
          {errors.prefReligion && (
            <p className="text-xs text-destructive">{errors.prefReligion.message}</p>
          )}
        </div>

        {/* Preferred marital status */}
        <div className="space-y-2">
          <Label>
            Preferred marital status
            <span className="ml-0.5 text-destructive" aria-hidden="true">
              *
            </span>
          </Label>
          <MultiSelect
            values={data.prefMaritalStatuses ?? []}
            onValuesChange={(values) => updateData({ prefMaritalStatuses: values })}
            options={[...MARITAL_STATUSES]}
            placeholder="Select marital status"
            searchPlaceholder="Search…"
            ariaLabel="Preferred marital status"
          />
          {errors.prefMaritalStatuses && (
            <p className="text-xs text-destructive">{errors.prefMaritalStatuses.message}</p>
          )}
        </div>

        <p className="pt-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Optional — these only change the order
        </p>

        {/* Preferred communities */}
        <div className="space-y-2">
          <Label>Preferred communities</Label>
          <MultiSelect
            values={data.prefCastes ?? []}
            onValuesChange={(values) =>
              updateData({
                prefCastes: values.some((value) => value.trim().toLowerCase() === "caste no bar")
                  ? ["Caste no bar"]
                  : values,
              })
            }
            options={communityOptions}
            placeholder="Any community"
            searchPlaceholder="Search communities…"
            ariaLabel="Preferred communities"
          />
        </div>

        {/* Preferred mother tongues */}
        <div className="space-y-2">
          <Label>Preferred mother tongues</Label>
          <MultiSelect
            values={data.prefMotherTongues ?? []}
            onValuesChange={(values) => updateData({ prefMotherTongues: values })}
            options={MOTHER_TONGUES}
            placeholder="Any mother tongue"
            searchPlaceholder="Search languages…"
            ariaLabel="Preferred mother tongues"
          />
        </div>

        {/* Minimum education */}
        <div className="space-y-2">
          <Label>Minimum education</Label>
          <SearchableSelect
            value={data.prefMinEducation || undefined}
            onValueChange={(value) => updateData({ prefMinEducation: value })}
            options={[...EDUCATION_LEVELS]}
            placeholder="No preference"
            searchPlaceholder="Search education…"
            allowCustom={false}
            ariaLabel="Minimum education"
          />
        </div>

        {/* Preferred locations */}
        <div className="space-y-2">
          <Label>Preferred locations</Label>
          <CityMultiSelect
            values={data.prefLocations ?? []}
            onValuesChange={(values) => updateData({ prefLocations: values })}
            placeholder="Search cities…"
            ariaLabel="Preferred locations"
          />
          <p className="text-xs text-muted-foreground">
            Same city list as your profile. Leave empty so location does not affect ranking.
          </p>
        </div>

        {/* Height range */}
        <div className="space-y-2">
          <Label>Preferred height range</Label>
          <div className="grid grid-cols-2 gap-3">
            <HeightCmInput
              valueCm={data.prefHeightMinCm}
              onChangeCm={(cm) => updateData({ prefHeightMinCm: cm })}
              ariaLabel="Preferred minimum height"
            />
            <HeightCmInput
              valueCm={data.prefHeightMaxCm}
              onChangeCm={(cm) => updateData({ prefHeightMaxCm: cm })}
              ariaLabel="Preferred maximum height"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            In centimetres, same as your height. Leave both empty to ignore height. A range ranks people inside it higher; it does not hide anyone outside it.
          </p>
          {errors.prefHeightMinCm && (
            <p className="text-xs text-destructive">{errors.prefHeightMinCm.message}</p>
          )}
        </div>
      </div>

      <Button className="w-full" size="lg" type="submit">
        Continue <ChevronRight className="ml-1 h-5 w-5" />
      </Button>
    </form>
  )
}

// ─── Step 5: OTP Verification ────────────────────────────────────────────────

function Step5OTP({
  data,
  updateData,
  onSubmit,
  isSubmitting,
}: {
  data: SignupData
  updateData: (fields: Partial<SignupData>) => void
  onSubmit: (otp: string) => Promise<void> | void
  isSubmitting?: boolean
}) {
  const form = useForm({
    resolver: zodResolver(signupStep5Schema),
    values: { otp: data.otp || "" },
    mode: "onChange",
  })
  const [seconds, setSeconds] = useState(30)
  const [otpSent, setOtpSent] = useState(true)
  const [error, setError] = useState("")

  React.useEffect(() => {
    if (!otpSent || seconds <= 0) return
    const id = window.setInterval(() => {
      setSeconds((s: any) => {
        if (s <= 1) {
          window.clearInterval(id)
          return 0
        }
        return s - 1
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [otpSent])

  const resend = async () => {
    setError("")
    try {
      await apiClient.auth.sendOtp({ phone: data.phone, consentAccepted: true, type: "register" })
      setSeconds(30)
      setOtpSent(true)
      form.setValue("otp", "")
    } catch (err: any) {
      setError(err.message || "Failed to resend OTP.")
    }
  }

  const handleVerifySubmit = async (values: { otp: string }) => {
    setError("")
    updateData({ otp: values.otp })
    try {
      await onSubmit(values.otp)
    } catch (err: any) {
      setError(err.message || "Failed to verify OTP or save profile. Please check and try again.")
    }
  }

  return (
    <form
      className="flex flex-col flex-1 min-h-[calc(100vh-140px)] md:min-h-0 space-y-8"
      onSubmit={form.handleSubmit(handleVerifySubmit)}
    >
      <StepHeading
        title="OTP verification"
        subtitle={`We've sent a 6-digit code to +91 ${data.phone}. Enter it to continue.`}
      />

      <div className="space-y-4">
        <div className="space-y-2 text-center">
          <Label htmlFor="otp" className="sr-only">
            OTP
          </Label>
            <Input
            id="otp"
            type="text"
              inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="••••••"
            className="h-14 text-center text-2xl tracking-[0.6em]"
            maxLength={6}
            {...form.register("otp", {
              onChange: (event) => {
                const next = event.target.value.replace(/\D/g, "")
                event.target.value = next
                updateData({ otp: next })
              },
            })}
          />
          {form.formState.errors.otp && (
            <p className="text-xs text-destructive">{form.formState.errors.otp.message}</p>
          )}
          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
                <button
                  type="button"
            disabled={seconds > 0}
            className="text-xs font-medium text-primary disabled:text-muted-foreground"
            onClick={resend}
          >
            {seconds > 0
              ? `Resend OTP in 00:${String(seconds).padStart(2, "0")}`
              : "Resend OTP"}
                </button>
        </div>

        <p className="rounded-xl bg-muted/60 px-4 py-3 text-center text-xs text-muted-foreground">
          Didn&apos;t receive it? Check that{" "}
          <span className="font-semibold text-foreground">+91 {data.phone}</span> is correct.
        </p>
      </div>

      <div className="mt-auto pt-4">
          <Button className="w-full" size="lg" type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verifying…
              </>
            ) : (
              "Verify & continue"
            )}
      </Button>
    </div>
    </form>
  )
}
