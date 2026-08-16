"use client"

import * as React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import { Logo } from "@/components/ui/logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Image from "next/image"
import { IMAGES } from "@/lib/images"
import { ArrowLeft, ShieldCheck } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [phone, setPhone] = useState("")
  const [otp, setOtp] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [seconds, setSeconds] = useState(30)

  React.useEffect(() => {
    if (!otpSent || seconds <= 0) return
    const id = window.setInterval(() => setSeconds((s) => s - 1), 1000)
    return () => window.clearInterval(id)
  }, [otpSent, seconds])

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
                className="space-y-7"
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
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                        maxLength={10}
                      />
                    </div>
                  </div>
                  <Button
                    className="w-full h-12 text-lg rounded-full"
                    disabled={!/^[6-9]\d{9}$/.test(phone)}
                    onClick={() => {
                      setOtpSent(true)
                      setSeconds(30)
                    }}
                  >
                    Send OTP
                  </Button>
                </div>
                <p className="text-center text-sm text-muted-foreground">
                  New to Astalakshimi?{" "}
                  <Link href="/register" className="font-semibold text-primary">
                    Register free
                  </Link>
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                className="space-y-7"
              >
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
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  maxLength={6}
                  autoFocus
                />
                <Button className="w-full" size="lg" disabled={otp.length !== 6} onClick={() => router.push("/dashboard")}>
                  Login
                </Button>
                <div className="flex items-center justify-between text-sm">
                  <button type="button" className="text-muted-foreground underline-offset-4 hover:underline" onClick={() => setOtpSent(false)}>
                    Change number
                  </button>
                  <button
                    type="button"
                    disabled={seconds > 0}
                    className="font-medium text-primary disabled:text-muted-foreground"
                    onClick={() => setSeconds(30)}
                  >
                    {seconds > 0 ? `Resend in ${seconds}s` : "Resend OTP"}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
