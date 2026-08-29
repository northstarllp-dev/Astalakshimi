"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { Logo } from "@/components/ui/logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { KolamCorner, TempleDivider } from "@/components/ui/temple-ornament"
import Image from "next/image"
import { IMAGES } from "@/lib/images"
import { loginOtpSchema, loginPhoneSchema, type LoginOtpValues, type LoginPhoneValues } from "@/lib/validation"
import { ArrowLeft, Clock3, Loader2, ShieldCheck } from "lucide-react"
import { apiClient } from "@/lib/api-client"

export default function LoginPage() {
  const router = useRouter()
  const [otpSent, setOtpSent] = React.useState(false)
  const [seconds, setSeconds] = React.useState(30)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState("")

  const phoneForm = useForm<LoginPhoneValues>({
    resolver: zodResolver(loginPhoneSchema),
    defaultValues: { phone: "" },
    mode: "onChange",
  })
  const otpForm = useForm<LoginOtpValues>({
    resolver: zodResolver(loginOtpSchema),
    defaultValues: { otp: "" },
    mode: "onChange",
  })

  const phone = phoneForm.watch("phone")

  React.useEffect(() => {
    if (!otpSent || seconds <= 0) return
    const id = window.setTimeout(() => setSeconds((s) => s - 1), 1000)
    return () => window.clearTimeout(id)
  }, [otpSent, seconds])

  const handleSendOtp = async (values: LoginPhoneValues) => {
    setError("")
    setLoading(true)
    try {
      await apiClient.auth.sendOtp({ phone: values.phone, consentAccepted: true })
      setOtpSent(true)
      setSeconds(30)
      otpForm.reset({ otp: "" })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send OTP. Please check the mobile number.")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (values: LoginOtpValues) => {
    setError("")
    setLoading(true)
    try {
      const auth = await apiClient.auth.verifyOtp({ phone: phoneForm.getValues("phone"), otp: values.otp })
      if (auth.hasProfile) {
        router.push("/home")
      } else {
        router.push("/register")
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid OTP. Please check and try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setError("")
    try {
      await apiClient.auth.sendOtp({ phone: phoneForm.getValues("phone"), consentAccepted: true })
      setSeconds(30)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to resend OTP.")
    }
  }

  return (
    <div className="relative flex min-h-dvh flex-col bg-background lg:flex-row">
      <aside className="relative isolate hidden min-h-dvh w-[48%] overflow-hidden lg:block">
        <Image
          src={IMAGES.login}
          alt=""
          fill
          priority
          className="object-cover object-[center_35%]"
          sizes="48vw"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(26,6,8,0.35) 0%, rgba(61,18,12,0.45) 42%, rgba(26,6,8,0.82) 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage: "radial-gradient(circle, #e8c84a 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="gold-rule absolute inset-x-0 top-0 z-10 opacity-80" />
        <div className="absolute inset-y-0 right-0 z-10 w-px bg-gradient-to-b from-transparent via-[#e8c84a]/50 to-transparent" />

        <div className="relative z-10 flex h-full flex-col justify-between p-10 xl:p-14">
          <Logo light href="/" />
          <div className="max-w-md space-y-5 pb-6">
            <p className="text-[11px] font-bold tracking-[0.28em] text-[#e8c84a] uppercase">Namaste · Welcome back</p>
            <h1 className="font-serif text-5xl font-bold leading-[1.08] text-white xl:text-[3.4rem]">
              Your matches
              <br />
              are waiting.
            </h1>
            <div className="ornament-line max-w-[10rem] text-[#e8c84a] text-xs">✦</div>
            <p className="max-w-sm text-sm leading-relaxed text-white/70">
              Sign in with OTP. No password to remember. Photos stay private until they are verified.
            </p>
            <ul className="mt-6 space-y-2.5 text-sm text-white/80">
              <li className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 shrink-0 text-[#e8c84a]" />
                Trusted by families across India
              </li>
              <li className="flex items-center gap-2.5">
                <Clock3 className="h-4 w-4 shrink-0 text-[#e8c84a]" />
                Photo review within 12 hours
              </li>
            </ul>
          </div>
        </div>
      </aside>

      <div className="relative flex min-h-dvh flex-1 flex-col kolam-surface">
        <header className="flex h-14 items-center justify-between px-4 safe-top lg:hidden">
          <Link href="/" className="tap-target inline-flex items-center justify-center text-muted-foreground hover:text-foreground" aria-label="Back to home">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Logo />
          <span className="w-11" aria-hidden />
        </header>

        <div className="relative mx-4 mb-2 overflow-hidden rounded-3xl lg:hidden">
          <div className="relative h-40">
            <Image
              src={IMAGES.login}
              alt="Temple lamps at dusk"
              fill
              priority
              className="object-cover object-[center_40%]"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1a0608] via-[#1a0608]/40 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4">
              <p className="text-[10px] font-bold tracking-[0.24em] text-[#e8c84a] uppercase">Namaste</p>
              <p className="font-serif text-2xl font-bold text-white">Your matches are waiting.</p>
            </div>
          </div>
        </div>

        <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 pb-10 pt-4 lg:px-10 lg:py-12">
          <Link
            href="/"
            className="mb-8 hidden items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground lg:inline-flex"
          >
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>

          <div className="relative overflow-hidden rounded-[1.75rem] border border-secondary/25 bg-card p-6 shadow-[0_8px_32px_rgba(26,14,8,0.06)] sm:p-8">
            <KolamCorner className="pointer-events-none absolute left-3 top-3 h-8 w-8" />
            <KolamCorner className="pointer-events-none absolute right-3 top-3 h-8 w-8 rotate-90" />
            <div className="gold-rule absolute inset-x-8 top-0" />

            <AnimatePresence mode="wait">
              {!otpSent ? (
                <motion.div
                  key="phone"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.28 }}
                >
                  <form className="space-y-6" onSubmit={phoneForm.handleSubmit(handleSendOtp)}>
                    <div className="space-y-2 pt-2 text-center">
                      <p className="royal-label">Sign in</p>
                      <h2 className="font-serif text-3xl font-bold md:text-[2.15rem]">Welcome back</h2>
                      <TempleDivider className="mx-auto max-w-[11rem] pt-1" />
                      <p className="text-sm text-muted-foreground">Enter the mobile number on your profile.</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="login-phone" className="text-[11px] font-semibold tracking-[0.14em] uppercase text-muted-foreground">
                        Mobile number
                      </Label>
                      <div className="flex">
                        <span className="inline-flex items-center rounded-l-xl border border-r-0 border-input bg-muted px-4 text-sm font-semibold text-foreground/70">
                          +91
                        </span>
                        <Input
                          id="login-phone"
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel"
                          placeholder="98765 43210"
                          className="rounded-l-none text-lg tracking-wide"
                          maxLength={10}
                          {...phoneForm.register("phone", {
                            onChange: (event) => {
                              event.target.value = event.target.value.replace(/\D/g, "")
                            },
                          })}
                        />
                      </div>
                      {phoneForm.formState.errors.phone && (
                        <p className="text-xs text-destructive">{phoneForm.formState.errors.phone.message}</p>
                      )}
                      {error && <p className="text-xs text-destructive">{error}</p>}
                    </div>

                    <Button className="h-12 w-full text-base" type="submit" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Sending OTP…
                        </>
                      ) : (
                        "Send OTP"
                      )}
                    </Button>

                    <p className="text-center text-sm text-muted-foreground">
                      New to Astalakshimi?{" "}
                      <Link href="/register" className="font-semibold text-primary underline-offset-4 hover:underline">
                        Register free
                      </Link>
                    </p>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="otp"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.28 }}
                >
                  <form className="space-y-6" onSubmit={otpForm.handleSubmit(handleVerifyOtp)}>
                    <div className="space-y-2 pt-2 text-center">
                      <p className="royal-label">Verify</p>
                      <h2 className="font-serif text-3xl font-bold">Enter OTP</h2>
                      <TempleDivider className="mx-auto max-w-[11rem] pt-1" />
                      <p className="text-sm text-muted-foreground">
                        6-digit code sent to{" "}
                        <span className="font-semibold text-foreground">+91 {phone}</span>
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="login-otp" className="sr-only">
                        One-time password
                      </Label>
                      <Input
                        id="login-otp"
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        placeholder="••••••"
                        className="h-14 text-center font-serif text-2xl tracking-[0.55em]"
                        maxLength={6}
                        autoFocus
                        {...otpForm.register("otp", {
                          onChange: (event) => {
                            event.target.value = event.target.value.replace(/\D/g, "")
                          },
                        })}
                      />
                      {otpForm.formState.errors.otp && (
                        <p className="text-xs text-destructive">{otpForm.formState.errors.otp.message}</p>
                      )}
                      {error && <p className="text-xs text-destructive">{error}</p>}
                    </div>

                    <Button className="h-12 w-full text-base" size="lg" type="submit" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Signing in…
                        </>
                      ) : (
                        "Sign in"
                      )}
                    </Button>

                    <div className="flex items-center justify-between text-sm">
                      <button
                        type="button"
                        className="cursor-pointer text-muted-foreground underline-offset-4 hover:underline"
                        onClick={() => {
                          setError("")
                          setOtpSent(false)
                        }}
                      >
                        Change number
                      </button>
                      <button
                        type="button"
                        disabled={seconds > 0 || loading}
                        className="cursor-pointer font-semibold text-primary disabled:cursor-not-allowed disabled:text-muted-foreground"
                        onClick={() => void handleResend()}
                      >
                        {seconds > 0 ? `Resend in ${seconds}s` : "Resend OTP"}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <p className="mt-6 hidden items-center justify-center gap-2 text-center text-xs text-muted-foreground lg:flex">
            <ShieldCheck className="h-3.5 w-3.5 text-gold" />
            Photos stay private until verified · OTP only, no password
          </p>
        </main>
      </div>
    </div>
  )
}
