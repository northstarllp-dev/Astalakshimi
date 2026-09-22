import { redirect } from "next/navigation"

/**
 * The standalone search page was superseded by Discover's "Search & Filter"
 * sub-tab (see /dashboard?view=search). Kept as a redirect so existing links
 * and bookmarks keep working. Logged-out visitors never reach this page — the
 * middleware sends them to /login first.
 */
export default function SearchPage() {
  redirect("/dashboard?view=search")
}
