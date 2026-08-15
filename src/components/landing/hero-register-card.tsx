"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function HeroRegisterCard() {
  const [looking, setLooking] = React.useState("Bride")

  return (
    <div className="relative rounded-3xl p-6 sm:p-8 border-[1.5px] border-secondary/40 bg-gradient-to-b from-[#2e0a0c]/70 to-[#1a0608]/50 backdrop-blur-xl shadow-2xl shadow-black/60">
      {/* Top ornament */}
      <div className="mb-5 flex items-center gap-2">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-secondary/40" />
        <span className="text-secondary text-base">✦</span>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-secondary/40" />
      </div>

      <p className="royal-label mb-1">Begin the search</p>
      <h2 className="font-serif text-2xl font-bold text-white leading-tight">Register free</h2>
      <p className="mt-1 text-sm text-white/70">Create a profile in under 4 minutes.</p>

      <form className="mt-6 space-y-4" action="/signup">
        {/* Looking for toggle */}
        <div className="space-y-2">
          <Label className="text-white/80 text-xs font-semibold tracking-wide uppercase">Looking for</Label>
          <div className="grid grid-cols-2 gap-2">
            {["Bride", "Groom"].map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setLooking(opt)}
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

        {/* Age & Community */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="age" className="text-white/80 text-xs font-semibold tracking-wide uppercase">Age</Label>
            <input
              id="age"
              type="number"
              defaultValue="25"
              inputMode="numeric"
              className="h-11 w-full rounded-xl border border-white/15 bg-black/20 px-3 text-white placeholder-white/40 text-sm focus:outline-none focus:border-secondary/60 focus:bg-black/40 transition-all"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="community" className="text-white/80 text-xs font-semibold tracking-wide uppercase">Community</Label>
            <select
              id="community"
              defaultValue="Tamil"
              className="h-11 w-full rounded-xl border border-white/15 bg-black/20 px-3 text-white text-sm focus:outline-none focus:border-secondary/60 focus:bg-black/40 transition-all appearance-none cursor-pointer"
            >
              <option value="Tamil" className="text-foreground bg-card">Tamil</option>
              <option value="Telugu" className="text-foreground bg-card">Telugu</option>
              <option value="Malayalam" className="text-foreground bg-card">Malayalam</option>
              <option value="Kannada" className="text-foreground bg-card">Kannada</option>
              <option value="Hindi" className="text-foreground bg-card">Hindi</option>
            </select>
          </div>
        </div>

        {/* CTA Button */}
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

      {/* Bottom ornament */}
      <div className="mt-5 flex items-center gap-2">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-secondary/30" />
        <span className="text-secondary/60 text-xs">✦ ✦ ✦</span>
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-secondary/30" />
      </div>
    </div>
  )
}
