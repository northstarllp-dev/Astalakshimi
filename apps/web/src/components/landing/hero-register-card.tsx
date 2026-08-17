"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { heroRegisterSchema, type HeroRegisterValues } from "@/lib/validation"

const MOTHER_TONGUES = [
  "Hindi",
  "Tamil",
  "Telugu",
  "Malayalam",
  "Kannada",
  "Marathi",
  "Bengali",
  "Gujarati",
  "Punjabi",
]

export function HeroRegisterCard() {
  const router = useRouter()
  const form = useForm<HeroRegisterValues>({
    resolver: zodResolver(heroRegisterSchema),
    defaultValues: { looking: "Bride", age: 25, motherTongue: "Hindi" },
    mode: "onChange",
  })
  const looking = form.watch("looking")
  const motherTongue = form.watch("motherTongue")

  return (
    <div className="relative rounded-3xl p-6 sm:p-8 border-[1.5px] border-secondary/40 bg-[#2e0a0c]/75 backdrop-blur-md shadow-2xl shadow-black/60">
      <div className="mb-5 flex items-center gap-2">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-secondary/40" />
        <span className="text-secondary text-base">✦</span>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-secondary/40" />
      </div>

      <p className="royal-label mb-1">Begin the search</p>
      <h2 className="font-serif text-2xl font-bold text-white leading-tight">Register free</h2>
      <p className="mt-1 text-sm text-white/70">Create a profile in under 4 minutes.</p>

      <form
        className="mt-6 space-y-4"
        onSubmit={form.handleSubmit((values) => {
          const params = new URLSearchParams({
            looking: values.looking,
            age: String(values.age),
            tongue: values.motherTongue,
          })
          router.push(`/register?${params.toString()}`)
        })}
      >
        <div className="space-y-2">
          <Label className="text-white/80 text-xs font-semibold tracking-wide uppercase">Looking for</Label>
          <div className="grid grid-cols-2 gap-2">
            {(["Bride", "Groom"] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => form.setValue("looking", opt, { shouldValidate: true })}
                className={`rounded-xl py-2.5 text-sm font-semibold border transition-all duration-200 ${looking === opt
                  ? "border-secondary bg-secondary/20 text-secondary shadow-sm"
                  : "border-white/15 bg-black/20 text-white/70 hover:border-white/30 hover:bg-black/40"
                  }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="age" className="text-white/80 text-xs font-semibold tracking-wide uppercase">Age</Label>
            <input
              id="age"
              type="number"
              inputMode="numeric"
              className="h-11 w-full rounded-xl border border-white/15 bg-black/20 px-3 text-white placeholder-white/40 text-sm focus:outline-none focus:border-secondary/60 focus:bg-black/40 transition-all"
              {...form.register("age", { valueAsNumber: true })}
            />
            {form.formState.errors.age && (
              <p className="text-[11px] text-red-300">{form.formState.errors.age.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="community" className="text-white/80 text-xs font-semibold tracking-wide uppercase">Mother tongue</Label>
            <Select
              value={motherTongue}
              onValueChange={(value) => form.setValue("motherTongue", value, { shouldValidate: true })}
            >
              <SelectTrigger
                id="community"
                className="h-11 border-white/15 bg-black/20 text-white shadow-none focus-visible:border-secondary/60 focus-visible:ring-secondary/20 [&_svg]:text-white/70"
              >
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {MOTHER_TONGUES.map((tongue) => (
                  <SelectItem key={tongue} value={tongue}>
                    {tongue}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full h-12 text-base font-bold rounded-xl bg-gradient-to-r from-secondary to-yellow-500 text-white border-0 shadow-lg shadow-secondary/30 hover:shadow-secondary/50 hover:from-secondary/90 hover:to-yellow-400 transition-all duration-200"
        >
          Let&apos;s begin →
        </Button>

        <p className="text-center text-xs text-white/60">
          Already registered?{" "}
          <Link href="/login" className="font-semibold text-secondary hover:text-yellow-400 transition-colors">
            Login
          </Link>
        </p>
      </form>

      <div className="mt-5 flex items-center gap-2">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-secondary/30" />
        <span className="text-secondary/60 text-xs">✦ ✦ ✦</span>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-secondary/30" />
      </div>
    </div>
  )
}
