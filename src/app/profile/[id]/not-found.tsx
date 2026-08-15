import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/ui/logo"

export default function ProfileNotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <Logo />
      <h1 className="font-serif text-2xl font-bold">Profile not found</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        This member may have deactivated their profile or the link is incorrect.
      </p>
      <Link href="/dashboard">
        <Button>Back to matches</Button>
      </Link>
    </div>
  )
}
