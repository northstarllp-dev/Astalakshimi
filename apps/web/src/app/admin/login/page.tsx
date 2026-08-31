"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Logo } from "@/components/ui/logo"
import { InstallAppButton } from "@/components/admin/install-app-button"
import { useAdminLoginMutation } from "@/hooks/admin-queries"
import { DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD } from "@/lib/admin-store"
import { adminLoginSchema, type AdminLoginValues } from "@/lib/validation"
import { Loader2 } from "lucide-react"

export default function AdminLoginPage() {
  const router = useRouter()
  const login = useAdminLoginMutation()
  const [error, setError] = React.useState("")

  const form = useForm<AdminLoginValues>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: { email: "", password: "" },
  })

  const onSubmit = async (values: AdminLoginValues) => {
    setError("")
    try {
      await login.mutateAsync(values)
      router.replace("/admin")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.")
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex items-center justify-between px-4 py-4 safe-top">
        <Logo href="/admin/login" size={36} />
        <InstallAppButton compact />
      </header>

      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 pb-10">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-foreground">
            Staff sign in
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Review profiles and verification. Separate from the member app.
          </p>
        </div>

        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">
              Work email
            </Label>
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="username"
              className="h-12 rounded-lg"
              {...form.register("email")}
            />
            {form.formState.errors.email && (
              <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">
              Password
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              className="h-12 rounded-lg"
              {...form.register("password")}
            />
            {form.formState.errors.password && (
              <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
            )}
          </div>

          {error && (
            <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" className="h-12 w-full rounded-lg" disabled={login.isPending}>
            {login.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing in…
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </form>

        <details className="mt-8 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <summary className="cursor-pointer font-medium text-foreground">Demo accounts</summary>
          <p className="mt-2 break-all">
            {DEMO_ADMIN_EMAIL}
            <br />
            {DEMO_ADMIN_PASSWORD}
          </p>
          <p className="mt-2 break-all">
            moderator@astalakshimi.in
            <br />
            Mod@2026
          </p>
        </details>

        <div className="mt-6 md:hidden">
          <InstallAppButton />
        </div>
      </main>
    </div>
  )
}
