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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ArrowLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  emptySignupData,
  formatSiblings,
  getPrefix,
  saveProfile,
  SIBLING_COUNTS,
  type SignupData,
} from "@/lib/profile-store"
import { StepHeading, StepProgress, TapCard } from "@/components/signup/shared"
import { Step6Verify, VerificationSubmitted } from "@/components/signup/step-verify"

const TOTAL_STEPS = 6
const REFERRED_BY_KEY = "astalakshimi.referredBy"

function SignupPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState(1)
  const [submitted, setSubmitted] = useState(false)
  const [data, setData] = useState<SignupData>(emptySignupData)

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

  const finishVerification = () => {
    const payload: SignupData = {
      ...data,
      siblings: formatSiblings(data.brothersCount, data.sistersCount),
      verificationStatus: "pending",
      submittedAt: new Date().toISOString(),
    }
    setData(payload)
    saveProfile(payload)
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
              <VerificationSubmitted onContinue={() => router.push("/dashboard")} />
            ) : (
              <>
                {step === 1 && <Step1PhoneOTP data={data} updateData={updateData} nextStep={nextStep} />}
                {step === 2 && <Step2ProfileFor data={data} updateData={updateData} nextStep={nextStep} />}
                {step === 3 && <Step3Community data={data} updateData={updateData} nextStep={nextStep} />}
                {step === 4 && <Step4Work data={data} updateData={updateData} nextStep={nextStep} />}
                {step === 5 && <Step5Prefs data={data} updateData={updateData} nextStep={nextStep} />}
                {step === 6 && (
                  <Step6Verify data={data} updateData={updateData} onSubmit={finishVerification} />
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

function Step1PhoneOTP({
  data,
  updateData,
  nextStep,
}: {
  data: SignupData
  updateData: (fields: Partial<SignupData>) => void
  nextStep: () => void
}) {
  const [otpSent, setOtpSent] = useState(false)
  const [terms, setTerms] = useState(false)
  const [seconds, setSeconds] = useState(30)

  React.useEffect(() => {
    if (!otpSent || seconds <= 0) return
    const id = window.setInterval(() => setSeconds((s) => s - 1), 1000)
    return () => window.clearInterval(id)
  }, [otpSent, seconds])

  return (
    <div className="flex flex-col flex-1 min-h-[calc(100vh-140px)] md:min-h-0 md:space-y-8">
      <StepHeading title="Welcome to Astalakshimi" subtitle="Register free with your mobile number. Families across India, verified photos, no password needed." />

      {!otpSent ? (
        <div className="flex flex-col flex-1 justify-between md:justify-start mt-8 md:mt-0">
          <div className="space-y-4">
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
                value={data.phone}
                onChange={(e) => updateData({ phone: e.target.value.replace(/\D/g, "") })}
                maxLength={10}
              />
            </div>
          </div>

          <label className="flex items-start gap-3 text-xs leading-relaxed text-muted-foreground">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-primary"
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
            />
            By continuing, you agree to our Terms of Service and Privacy Policy. Profiles are screened before they go live.
          </label>

          </div>

          <div className="mt-auto space-y-4 pt-8 pb-4 md:mt-0 md:pb-0 md:pt-4">
            <Button
              className="w-full"
              size="lg"
              disabled={!/^[6-9]\d{9}$/.test(data.phone) || !terms}
              onClick={() => {
                setOtpSent(true)
                setSeconds(30)
              }}
            >
              Get OTP
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already a member?{" "}
              <Link href="/login" className="font-semibold text-primary">
                Login
              </Link>
            </p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col flex-1 justify-between md:justify-start mt-8 md:mt-0">
          <div className="space-y-2 text-center">
            <Label htmlFor="otp">Enter the 6-digit OTP sent to +91 {data.phone}</Label>
            <Input
              id="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="••••••"
              className="h-14 text-center text-2xl tracking-[0.6em]"
              value={data.otp}
              onChange={(e) => updateData({ otp: e.target.value.replace(/\D/g, "") })}
              maxLength={6}
            />
            <button
              type="button"
              disabled={seconds > 0}
              className="text-xs font-medium text-primary disabled:text-muted-foreground"
              onClick={() => setSeconds(30)}
            >
              {seconds > 0 ? `Resend OTP in 00:${String(seconds).padStart(2, "0")}` : "Resend OTP"}
            </button>
          </div>
          <div className="mt-auto pt-8 pb-4 md:mt-0 md:pb-0 md:pt-4">
            <Button className="w-full" size="lg" disabled={data.otp.length !== 6} onClick={nextStep}>
              Verify & Continue
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

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

function Step2ProfileFor({
  data,
  updateData,
  nextStep,
}: {
  data: SignupData
  updateData: (fields: Partial<SignupData>) => void
  nextStep: () => void
}) {
  const profileOptions = [
    { id: "Myself", icon: "👤" },
    { id: "Son", icon: "👦" },
    { id: "Daughter", icon: "👧" },
    { id: "Brother", icon: "🧑" },
    { id: "Sister", icon: "👩" },
    { id: "Relative", icon: "👥" },
  ]
  const isDobComplete = data.dobDay.length === 2 && data.dobMonth.length === 2 && data.dobYear.length === 4
  let isAgeValid = false
  let ageError = ""
  
  if (isDobComplete) {
    const dob = new Date(`${data.dobYear}-${data.dobMonth}-${data.dobDay}`)
    if (!isNaN(dob.getTime())) {
      const today = new Date()
      let age = today.getFullYear() - dob.getFullYear()
      const m = today.getMonth() - dob.getMonth()
      if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
        age--
      }
      const minAge = data.gender === "Male" ? 21 : 18
      if (age < minAge) {
        ageError = `Must be at least ${minAge} years old.`
      } else if (age > 100) {
        ageError = "Please enter a valid age."
      } else {
        isAgeValid = true
      }
    } else {
      ageError = "Invalid date."
    }
  }

  const isNameValid = data.fullName.trim().length >= 3 && /^[a-zA-Z\s]*$/.test(data.fullName)
  const isComplete = data.profileFor && isNameValid && data.gender && isAgeValid && data.maritalStatus

  return (
    <div className="space-y-8">
      <StepHeading title="Let's set up the profile" subtitle="Who are you creating this profile for?" />

      <div className="grid grid-cols-3 gap-2.5">
        {profileOptions.map((opt) => (
          <TapCard
            key={opt.id}
            selected={data.profileFor === opt.id}
            onClick={() => {
              let autoGender = data.gender
              if (opt.id === "Son" || opt.id === "Brother") autoGender = "Male"
              if (opt.id === "Daughter" || opt.id === "Sister") autoGender = "Female"
              updateData({ profileFor: opt.id, gender: autoGender })
            }}
            title={opt.id}
            icon={opt.icon}
          />
        ))}
      </div>

      {data.profileFor && (
        <div className="space-y-5 animate-in">
          <div className="space-y-2">
            <Label htmlFor="fullName">
              {data.profileFor === "Myself" ? "Full name" : `${getPrefix(data.profileFor)} full name`}
            </Label>
            <Input
              id="fullName"
              placeholder="e.g. Priya Sharma"
              autoComplete="name"
              value={data.fullName}
              onChange={(e) => updateData({ fullName: e.target.value })}
            />
            {data.fullName.length > 0 && data.fullName.trim().length < 3 && (
              <p className="text-xs text-destructive">Name must be at least 3 characters.</p>
            )}
            {!/^[a-zA-Z\s]*$/.test(data.fullName) && (
              <p className="text-xs text-destructive">Name can only contain letters.</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>{data.profileFor === "Myself" ? "Gender" : `${getPrefix(data.profileFor)} gender`}</Label>
            <div className="grid grid-cols-3 gap-2.5">
              {["Male", "Female", "Other"].map((g) => (
                <TapCard key={g} selected={data.gender === g} onClick={() => updateData({ gender: g })} title={g} />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{data.profileFor === "Myself" ? "Date of birth" : `${getPrefix(data.profileFor)} date of birth`}</Label>
            <DobFields
              day={data.dobDay}
              month={data.dobMonth}
              year={data.dobYear}
              onChange={updateData}
            />
            {ageError && <p className="text-xs text-destructive">{ageError}</p>}
          </div>

          <div className="space-y-2">
            <Label>{data.profileFor === "Myself" ? "Marital status" : `${getPrefix(data.profileFor)} marital status`}</Label>
            <Select
              value={data.maritalStatus || undefined}
              onValueChange={(maritalStatus) => updateData({ maritalStatus })}
            >
              <SelectTrigger className="w-full" aria-label="Marital status">
                <SelectValue placeholder="Select marital status" />
              </SelectTrigger>
              <SelectContent>
                {["Never Married", "Divorced", "Widowed", "Awaiting Divorce"].map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <Button className="w-full" size="lg" disabled={!isComplete} onClick={nextStep}>
        Continue <ChevronRight className="ml-1 h-5 w-5" />
      </Button>
    </div>
  )
}

function Step3Community({
  data,
  updateData,
  nextStep,
}: {
  data: SignupData
  updateData: (fields: Partial<SignupData>) => void
  nextStep: () => void
}) {
  const isCasteValid = data.caste.trim().length >= 2
  const isComplete = data.religion && isCasteValid && data.motherTongue
  const prefix = data.profileFor ? `${getPrefix(data.profileFor)} ` : ""

  const setSiblings = (brothersCount: number, sistersCount: number) => {
    updateData({
      brothersCount,
      sistersCount,
      siblings: formatSiblings(brothersCount, sistersCount),
    })
  }

  return (
    <div className="space-y-8">
      <StepHeading title="Community & background" subtitle="These details help families find the right match." />
      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="religion">{prefix}Religion</Label>
          <Select
            value={data.religion || undefined}
            onValueChange={(religion) => updateData({ religion })}
          >
            <SelectTrigger id="religion" className="w-full">
              <SelectValue placeholder="Select religion" />
            </SelectTrigger>
            <SelectContent>
              {["Hindu", "Muslim", "Christian", "Sikh", "Jain", "Buddhist", "Other"].map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="caste">{prefix}Caste / community</Label>
          <Input
            id="caste"
            placeholder="Type caste or community..."
            value={data.caste}
            onChange={(e) => updateData({ caste: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tongue">{prefix}Mother tongue</Label>
          <Select
            value={data.motherTongue || undefined}
            onValueChange={(motherTongue) => updateData({ motherTongue })}
          >
            <SelectTrigger id="tongue" className="w-full">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {["Tamil", "Telugu", "Hindi", "Malayalam", "Kannada", "Marathi", "Bengali", "Gujarati"].map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3 rounded-2xl border border-border bg-muted/40 p-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Siblings</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              How many brothers and sisters? Choose 0 if only child.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="brothers">{prefix}Brothers</Label>
              <Select
                value={String(data.brothersCount)}
                onValueChange={(v) => setSiblings(Number(v), data.sistersCount)}
              >
                <SelectTrigger id="brothers" className="w-full bg-card">
                  <SelectValue placeholder="Brothers" />
                </SelectTrigger>
                <SelectContent>
                  {SIBLING_COUNTS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n === 5 ? "5+" : String(n)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sisters">{prefix}Sisters</Label>
              <Select
                value={String(data.sistersCount)}
                onValueChange={(v) => setSiblings(data.brothersCount, Number(v))}
              >
                <SelectTrigger id="sisters" className="w-full bg-card">
                  <SelectValue placeholder="Sisters" />
                </SelectTrigger>
                <SelectContent>
                  {SIBLING_COUNTS.map((n) => (
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
      <Button className="w-full" size="lg" disabled={!isComplete} onClick={nextStep}>
        Continue <ChevronRight className="ml-1 h-5 w-5" />
      </Button>
    </div>
  )
}

function Step4Work({
  data,
  updateData,
  nextStep,
}: {
  data: SignupData
  updateData: (fields: Partial<SignupData>) => void
  nextStep: () => void
}) {
  const isWorking = Boolean(data.occupation) && data.occupation !== "Not Working"
  const isEduComplete = data.education && (data.education !== "Other" || data.otherEducation.trim().length >= 2)
  const isOccComplete = data.occupation && (data.occupation !== "Other" || data.otherOccupation.trim().length >= 2)
  const isWorkDetailsComplete = !isWorking || (data.companyName.trim().length >= 2 && Boolean(data.annualIncome))
  const isComplete = isEduComplete && isOccComplete && isWorkDetailsComplete && data.city.trim().length >= 2
  const prefix = data.profileFor ? `${getPrefix(data.profileFor)} ` : ""

  return (
    <div className="space-y-8">
      <StepHeading title="Education & career" subtitle="Matches often filter by education, profession, company and income." />
      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="education">{prefix}Highest education</Label>
          <Select
            value={data.education || undefined}
            onValueChange={(education) => updateData({ education })}
          >
            <SelectTrigger id="education" className="w-full">
              <SelectValue placeholder="Select education" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>Engineering / Design</SelectLabel>
                <SelectItem value="B.E / B.Tech">B.E / B.Tech</SelectItem>
                <SelectItem value="M.E / M.Tech">M.E / M.Tech</SelectItem>
                <SelectItem value="B.Arch">B.Arch</SelectItem>
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>Computers / IT</SelectLabel>
                <SelectItem value="BCA">BCA</SelectItem>
                <SelectItem value="MCA">MCA</SelectItem>
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>Finance / Management</SelectLabel>
                <SelectItem value="B.Com">B.Com</SelectItem>
                <SelectItem value="MBA / PGDM">MBA / PGDM</SelectItem>
                <SelectItem value="CA / CS">CA / CS</SelectItem>
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>Medicine</SelectLabel>
                <SelectItem value="MBBS">MBBS</SelectItem>
                <SelectItem value="MD / MS">MD / MS</SelectItem>
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>Arts / Science</SelectLabel>
                <SelectItem value="B.A">B.A</SelectItem>
                <SelectItem value="B.Sc">B.Sc</SelectItem>
                <SelectItem value="M.Sc">M.Sc</SelectItem>
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>Higher Education</SelectLabel>
                <SelectItem value="Ph.D">Ph.D</SelectItem>
                <SelectItem value="M.Phil">M.Phil</SelectItem>
                <SelectItem value="Post Doctorate">Post Doctorate</SelectItem>
              </SelectGroup>
              <SelectGroup>
                <SelectLabel>Others</SelectLabel>
                <SelectItem value="Diploma">Diploma</SelectItem>
                <SelectItem value="Other">Other (type below)</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          {data.education === "Other" && (
            <Input
              placeholder="Type education degree..."
              value={data.otherEducation}
              onChange={(e) => updateData({ otherEducation: e.target.value })}
            />
          )}
          {data.education && (
            <Input
              placeholder="Specialization / Stream (optional, e.g. Computer Science)"
              value={data.educationStream}
              onChange={(e) => updateData({ educationStream: e.target.value })}
            />
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="occupation">{prefix}Occupation</Label>
          <Select
            value={data.occupation || undefined}
            onValueChange={(occupation) => {
              if (occupation === "Not Working") {
                updateData({ occupation, companyName: "", annualIncome: "" })
              } else {
                updateData({ occupation })
              }
            }}
          >
            <SelectTrigger id="occupation" className="w-full">
              <SelectValue placeholder="Select occupation" />
            </SelectTrigger>
            <SelectContent>
              {[
                "Private Sector",
                "Government / Public Sector",
                "Defense / Civil Services",
                "Business / Self Employed",
                "IT / Software Professional",
                "Healthcare Professional / Doctor",
                "Teacher / Academician",
                "Finance / CA / CS",
                "Lawyer / Legal",
                "Not Working",
                "Other",
              ].map((o) => (
                <SelectItem key={o} value={o}>
                  {o}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {data.occupation === "Other" && (
            <Input
              placeholder="Type occupation..."
              value={data.otherOccupation}
              onChange={(e) => updateData({ otherOccupation: e.target.value })}
            />
          )}
        </div>

        {isWorking && (
          <div className="space-y-5 animate-in">
            <div className="space-y-2">
              <Label htmlFor="companyName">
                {data.occupation === "Business / Self Employed" ? `${prefix}Business / firm name` : `${prefix}Company name`}
              </Label>
              <Input
                id="companyName"
                placeholder={
                  data.occupation === "Business / Self Employed"
                    ? "e.g. Sharma Traders"
                    : "e.g. TCS, Infosys, Google"
                }
                value={data.companyName}
                onChange={(e) => updateData({ companyName: e.target.value })}
                autoComplete="organization"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="annualIncome">{prefix}Annual income</Label>
              <Select
                value={data.annualIncome || undefined}
                onValueChange={(annualIncome) => updateData({ annualIncome })}
              >
                <SelectTrigger id="annualIncome" className="w-full">
                  <SelectValue placeholder="Select annual income" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    "Under ₹3 Lakh",
                    "₹3 – 5 Lakh",
                    "₹5 – 7 Lakh",
                    "₹7 – 10 Lakh",
                    "₹10 – 15 Lakh",
                    "₹15 – 20 Lakh",
                    "₹20 – 30 Lakh",
                    "₹30 – 50 Lakh",
                    "₹50 Lakh – 1 Crore",
                    "Above ₹1 Crore",
                    "Prefer not to say",
                  ].map((income) => (
                    <SelectItem key={income} value={income}>
                      {income}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Shown only to serious matches. You can keep this private later.</p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="city">{prefix}Current city</Label>
          <Input
            id="city"
            placeholder="e.g. Chennai, Bangalore"
            value={data.city}
            onChange={(e) => updateData({ city: e.target.value })}
          />
        </div>
      </div>
      <Button className="w-full" size="lg" disabled={!isComplete} onClick={nextStep}>
        Continue <ChevronRight className="ml-1 h-5 w-5" />
      </Button>
    </div>
  )
}

function Step5Prefs({
  data,
  updateData,
  nextStep,
}: {
  data: SignupData
  updateData: (fields: Partial<SignupData>) => void
  nextStep: () => void
}) {
  const isAgeValid = data.prefAgeMin >= 18 && data.prefAgeMax >= data.prefAgeMin && data.prefAgeMax <= 100
  const isComplete = isAgeValid && data.prefReligion.length > 0
  return (
    <div className="space-y-8">
      <StepHeading title="Partner preferences" subtitle="Tell us what you are looking for. You can change this later." />
      <div className="space-y-6">
        <div className="space-y-3">
          <Label>
            Age range ({data.prefAgeMin} – {data.prefAgeMax} years)
          </Label>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              inputMode="numeric"
              value={data.prefAgeMin}
              onChange={(e) => updateData({ prefAgeMin: Number(e.target.value) })}
              className="w-24 text-center"
            />
            <span className="text-muted-foreground">to</span>
            <Input
              type="number"
              inputMode="numeric"
              value={data.prefAgeMax}
              onChange={(e) => {
                const max = Number(e.target.value)
                updateData({ prefAgeMax: max })
              }}
              className="w-24 text-center"
            />
          </div>
          {!isAgeValid && (
            <p className="text-xs text-destructive">Please enter a valid age range (Min 18).</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Religion preference</Label>
          <div className="flex flex-wrap gap-2">
            {["Open to all", "Hindu", "Muslim", "Christian", "Sikh", "Jain"].map((rel) => {
              const isSelected = data.prefReligion.includes(rel)
              return (
                <button
                  type="button"
                  key={rel}
                  onClick={() => {
                    if (rel === "Open to all") updateData({ prefReligion: ["Open to all"] })
                    else {
                      let next = data.prefReligion.filter((r) => r !== "Open to all")
                      if (isSelected) next = next.filter((r) => r !== rel)
                      else next = [...next, rel]
                      updateData({ prefReligion: next })
                    }
                  }}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm transition-colors",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40"
                  )}
                >
                  {rel}
                </button>
              )
            })}
          </div>
        </div>
      </div>
      <Button className="w-full" size="lg" disabled={!isComplete} onClick={nextStep}>
        Continue to photos <ChevronRight className="ml-1 h-5 w-5" />
      </Button>
    </div>
  )
}
