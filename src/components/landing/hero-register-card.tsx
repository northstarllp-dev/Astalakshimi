"use client"

import * as React from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function HeroRegisterCard() {
  const [looking, setLooking] = React.useState("Bride")

  return (
    <div className="rounded-3xl border border-white/40 bg-white/25 p-5 text-foreground shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] backdrop-blur-xl sm:p-7">
      <p className="text-[11px] font-semibold tracking-[0.2em] text-primary uppercase">Begin the search</p>
      <h2 className="font-serif text-2xl font-bold">Register free</h2>
      <p className="mt-1 text-sm text-muted-foreground">Create a profile in under 4 minutes.</p>
      <form className="mt-5 space-y-4" action="/signup">
        <div className="space-y-2">
          <Label>Looking for</Label>
          <div className="grid grid-cols-2 gap-2">
            {["Bride", "Groom"].map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setLooking(opt)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors ${
                  looking === opt ? "border-primary bg-primary/20 text-primary" : "border-foreground/20 hover:bg-white/10"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="age">Age</Label>
            <Input id="age" defaultValue="25" inputMode="numeric" className="bg-white/40 border-white/40 focus:bg-white/70 transition-colors" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="community">Community</Label>
            <select id="community" className="field-select bg-white/40 border-white/40 focus:bg-white/70 transition-colors" defaultValue="Tamil">
              <option>Tamil</option>
              <option>Telugu</option>
              <option>Malayalam</option>
              <option>Kannada</option>
              <option>Hindi</option>
            </select>
          </div>
        </div>
        <Button type="submit" className="w-full" size="lg">
          Let&apos;s begin
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Already registered?{" "}
          <Link href="/login" className="font-semibold text-primary">
            Login
          </Link>
        </p>
      </form>
    </div>
  )
}
