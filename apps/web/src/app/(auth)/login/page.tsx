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
import Image from "next/image"
import { IMAGES } from "@/lib/images"
import { loginOtpSchema, loginPhoneSchema, type LoginOtpValues, type LoginPhoneValues } from "@/lib/validation"
import { ArrowLeft, Loader2, ShieldCheck } from "lucide-react"
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
    const id = window.setInterval(() => setSeconds((s) => s - 1), 1000)
    return () => window.clearInterval(id)
  }, [otpSent, seconds])

  const handleSendOtp = async (values: LoginPhoneValues) => {
    setError("")
    setLoading(true)
    try {
      await apiClient.auth.sendOtp({ phone: values.phone, consentAccepted: true })
      setOtpSent(true)
      setSeconds(30)
      otpForm.reset({ otp: "" })
    } catch (err: any) {
      setError(err.message || "Failed to send OTP. Please check the mobile number.")
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (values: LoginOtpValues) => {
    setError("")
    setLoading(true)
    try {
      const auth = await apiClient.auth.verifyOtp({ phone: phoneForm.getValues("phone"), otp: values.otp })
      if (auth.accessToken) {
        apiClient.setToken(auth.accessToken)
      }
      if (auth.hasProfile) {
        router.push("/home")
      } else {
        router.push("/register")
      }
    } catch (err: any) {
      setError(err.message || "Invalid OTP. Please check and try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setError("")
    try {
      await apiClient.auth.sendOtp({ phone: phoneForm.getValues("phone"), consentAccepted: true })
      setSeconds(30)
    } catch (err: any) {
      setError(err.message || "Failed to resend OTP.")
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center px-4 safe-top">
        <Link href="/" className="mr-3 text-muted-foreground hover:text-foreground" aria-label="Back to home">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Logo />
      </header>

      <main className="mx-auto grid w-full max-w-5xl flex-1 items-center gap-10 px-4 py-8 md:grid-cols-2 md:py-12">
        <div className="hidden space-y-6 md:block">
          <div className="relative overflow-hidden rounded-3xl border border-secondary/30 temple-frame">
            <Image
              src={IMAGES.login}
              alt="South Indian temple lamps at dusk"
              width={720}
              height={960}
              className="h-80 w-full object-cover"
              priority
            />
          </div>
          <p className="text-xs font-semibold tracking-[0.22em] text-gold uppercase">Namaste</p>
          <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">Welcome back</p>
          <h1 className="font-serif text-4xl font-bold leading-tight">Your matches are waiting.</h1>
          <p className="max-w-sm text-muted-foreground">
            Login with OTP. No password to remember. Your photos stay private until they are verified.
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Trusted by families across India
          </div>
        </div>

        <div className="mx-auto w-full max-w-md rounded-3xl border border-secondary/30 bg-card p-6 shadow-sm sm:p-8">
          <AnimatePresence mode="wait">
            {!otpSent ? (
              <motion.div
                key="phone"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
              >
                <form
                  className="space-y-7"
                  onSubmit={phoneForm.handleSubmit(handleSendOtp)}
                >
                  <div className="space-y-2 text-center md:text-left">
                    <h2 className="font-serif text-3xl font-bold">Login</h2>
                    <p className="text-sm text-muted-foreground">Enter the mobile number on your profile.</p>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-phone">Mobile number</Label>
                      <div className="flex">
                        <span className="inline-flex items-center rounded-l-xl border border-r-0 border-input bg-muted px-4 text-sm text-muted-foreground">
                          +91
                        </span>
                        <Input
                          id="login-phone"
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel"
                          placeholder="98765 43210"
                          className="rounded-l-none text-lg"
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
                      {error && (
                        <p className="text-xs text-destructive">{error}</p>
                      )}
                    </div>
                    <Button className="w-full h-12 text-lg rounded-full" type="submit" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Sending OTP…
                        </>
                      ) : (
                        "Send OTP"
                      )}
                    </Button>
                  </div>
                  <p className="text-center text-sm text-muted-foreground">
                    New to Astalakshimi?{" "}
                    <Link href="/register" className="font-semibold text-primary">
                      Register free
                    </Link>
                  </p>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
              >
                <form className="space-y-7" onSubmit={otpForm.handleSubmit(handleVerifyOtp)}>
                  <div className="space-y-2 text-center md:text-left">
                    <h2 className="font-serif text-2xl font-bold">Verify OTP</h2>
                    <p className="text-sm text-muted-foreground">Enter the 6-digit code sent to +91 {phone}</p>
                  </div>
                  <Input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="••••••"
                    className="h-14 text-center text-2xl tracking-[0.6em]"
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
                  {error && (
                    <p className="text-xs text-destructive">{error}</p>
                  )}
                  <Button className="w-full" size="lg" type="submit" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Logging in…
                      </>
                    ) : (
                      "Login"
                    )}
                  </Button>
                  <div className="flex items-center justify-between text-sm">
                    <button
                      type="button"
                      className="text-muted-foreground underline-offset-4 hover:underline"
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
                      className="font-medium text-primary disabled:text-muted-foreground"
                      onClick={handleResend}
                    >
                      {seconds > 0 ? `Resend in ${seconds}s` : "Resend OTP"}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
