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
import { ArrowLeft, ChevronRight, Loader2 } from "lucide-react"
import { apiClient } from "@/lib/api-client"
import {
  emptySignupData,
  formatSiblings,
  SIBLING_COUNTS,
  RELIGIONS,
  MOTHER_TONGUES,
  MARITAL_STATUSES,
  FAMILY_TYPES,
  FAMILY_STATUS,
  type SignupData,
} from "@/lib/profile-store"
import { StepHeading, StepProgress, TapCard } from "@/components/signup/shared"
import { Step4Verify, VerificationSubmitted } from "@/components/signup/step-verify"
import { useSaveProfileMutation } from "@/hooks/queries"
import {
  signupStep1Schema,
  signupStep2Schema,
  signupStep3Schema,
  signupStep5Schema,
} from "@/lib/validation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

const TOTAL_STEPS = 5
const REFERRED_BY_KEY = "astalakshimi.referredBy"

function SignupPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState(1)
  const [submitted, setSubmitted] = useState(false)
  const [data, setData] = useState<SignupData>(emptySignupData)
  const saveProfileMutation = useSaveProfileMutation()

  React.useEffect(() => {
    const ref = searchParams.get("ref")
    if (ref && typeof window !== "undefined") {
      sessionStorage.setItem(REFERRED_BY_KEY, ref)
    }
  }, [searchParams])

  const updateData = (fields: Partial<SignupData>) => {
    setData((prev) => ({ ...prev, ...fields }))
  }

  const nextStep = () => setStep((prev) => Math.min(prev + 1, TOTAL_STEPS))
  const prevStep = () => {
    if (submitted) {
      setSubmitted(false)
      return
    }
    if (step > 1) setStep((prev) => prev - 1)
  }

  const finishVerification = async (enteredOtp?: string) => {
    const otpToUse = enteredOtp || data.otp || '123456'
    
    // First verify OTP and get token
    try {
      const auth = await apiClient.auth.verifyOtp({ phone: data.phone, otp: otpToUse })
      if (auth.accessToken) {
        apiClient.setToken(auth.accessToken)
      }
    } catch (err: any) {
      throw new Error(err.message || "Invalid OTP. Please check and try again.")
    }

    const payload: SignupData = {
      ...data,
      otp: otpToUse,
      siblings: formatSiblings(data.brothersCount, data.sistersCount),
      verificationStatus: "pending",
      submittedAt: new Date().toISOString(),
    }
    await saveProfileMutation.mutateAsync(payload)
    setSubmitted(true)
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
            <Logo />
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
                {step === 1 && <Step1AccountCreation data={data} updateData={updateData} nextStep={nextStep} />}
                {step === 2 && <Step2Identity data={data} updateData={updateData} nextStep={nextStep} />}
                {step === 3 && <Step3Community data={data} updateData={updateData} nextStep={nextStep} />}
                {step === 4 && (
                  <Step4Verify data={data} updateData={updateData} onNext={nextStep} />
                )}
                {step === 5 && (
                  <Step5OTP
                    data={data}
                    updateData={updateData}
                    onSubmit={finishVerification}
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
}: {
  data: SignupData
  updateData: (fields: Partial<SignupData>) => void
  nextStep: () => void
}) {
  const [loading, setLoading] = useState(false)
  const form = useForm({
    resolver: zodResolver(signupStep1Schema),
    defaultValues: { profileFor: data.profileFor, phone: data.phone, terms: false },
    mode: "onChange",
  })
  const profileFor = form.watch("profileFor")

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
    updateData({ profileFor: values.profileFor, phone: values.phone })
    try {
      const res = await apiClient.auth.sendOtp({ phone: values.phone, consentAccepted: true, type: "register" })
      if (res.mockOtp) {
        updateData({ otp: res.mockOtp })
      }
      nextStep()
    } catch (err: any) {
      console.warn("sendOtp error:", err)
      if (err.message && err.message.toLowerCase().includes("already registered")) {
        router.push("/login")
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
              <Link href="/login" className="font-semibold text-primary">
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
    resolver: zodResolver(signupStep2Schema),
    values: {
      fullName: data.fullName,
      gender: data.gender,
      dobDay: data.dobDay,
      dobMonth: data.dobMonth,
      dobYear: data.dobYear,
      maritalStatus: data.maritalStatus,
      city: data.city,
    },
    mode: "onChange",
  })
  const errors = form.formState.errors

  return (
    <form className="space-y-8" onSubmit={form.handleSubmit(() => nextStep())}>
      <StepHeading
        title="Identity"
        subtitle="Tell us about the person looking for a match."
      />

      <div className="space-y-5">
        {/* Name */}
          <div className="space-y-2">
          <Label htmlFor="fullName">{p}Full name</Label>
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
          <Label>Gender</Label>
            <div className="grid grid-cols-3 gap-2.5">
              {["Male", "Female", "Other"].map((g) => (
                <TapCard key={g} selected={data.gender === g} onClick={() => updateData({ gender: g })} title={g} />
              ))}
            </div>
          </div>

        {/* DOB */}
          <div className="space-y-2">
          <Label>{p}Date of birth</Label>
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
          <Label>{p}Marital status</Label>
          <Select
            value={data.maritalStatus || undefined}
            onValueChange={(maritalStatus) => updateData({ maritalStatus })}
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

        {/* Location */}
        <div className="space-y-2">
          <Label htmlFor="city">{p}Current city</Label>
          <Input
            id="city"
            placeholder="e.g. Chennai, Bangalore"
            value={data.city}
            onChange={(e) => updateData({ city: e.target.value })}
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
        subtitle="These details help families find the right match."
      />

      <div className="space-y-5">
        {/* Religion */}
        <div className="space-y-2">
          <Label htmlFor="religion">{p}Religion / community</Label>
          <Select
            value={data.religion || undefined}
            onValueChange={(religion) => updateData({ religion })}
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
          <Label htmlFor="caste">{p}Caste / community</Label>
          <Input
            id="caste"
            placeholder="Type caste or community…"
            value={data.caste}
            onChange={(e) => updateData({ caste: e.target.value })}
          />
          {errors.caste && <p className="text-xs text-destructive">{errors.caste.message}</p>}
        </div>

        {/* Mother tongue */}
        <div className="space-y-2">
          <Label htmlFor="tongue">{p}Mother tongue</Label>
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
              Brothers, sisters, and family background  used by families to assess compatibility.
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
                {FAMILY_STATUS.map((s: any) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

// ─── Step 5: OTP Verification ────────────────────────────────────────────────

function Step5OTP({
  data,
  updateData,
  onSubmit,
  isSubmitting,
}: {
  data: SignupData
  updateData: (fields: Partial<SignupData>) => void
  onSubmit: (otp?: string) => Promise<void> | void
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
      const res = await apiClient.auth.sendOtp({ phone: data.phone, consentAccepted: true, type: "register" })
      setSeconds(30)
      setOtpSent(true)
      if (res.mockOtp) {
        form.setValue("otp", res.mockOtp)
      } else {
        form.setValue("otp", "")
      }
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
        subtitle={`We've sent a 6-digit code to +91 ${data.phone}. Enter it below to create your profile.`}
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
              <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Creating profile…
            </>
          ) : (
            "Verify & create profile"
          )}
      </Button>
    </div>
    </form>
  )
}
