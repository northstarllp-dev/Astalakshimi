import type { Metadata, Viewport } from "next"
import { Cormorant_Garamond, Mukta, Tiro_Tamil } from "next/font/google"
import { QueryProvider } from "@/providers/query-provider"
import "./globals.css"

const mukta = Mukta({
  subsets: ["latin", "devanagari"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mukta",
  display: "swap",
})

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
})

const tiroTamil = Tiro_Tamil({
  subsets: ["tamil", "latin"],
  weight: "400",
  variable: "--font-tiro",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Astalakshimi Matrimony | Find Your Forever Partner",
  description:
    "India's trusted matrimony for families across every community and mother tongue. Verified photos, screened profiles, and matches rooted in tradition.",
  applicationName: "Astalakshimi",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Asta Admin",
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#7c1535",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${mukta.variable} ${cormorant.variable} ${tiroTamil.variable}`}
    >
      <body className="kolam-surface antialiased min-h-dvh bg-background text-foreground">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  )
}
