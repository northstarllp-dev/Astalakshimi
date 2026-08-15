import type { Metadata, Viewport } from "next"
import { Cormorant_Garamond, Outfit, Tiro_Tamil } from "next/font/google"
import "./globals.css"

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
})

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
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
  title: "Astalakshimi Matrimony | South Indian Matchmaking",
  description:
    "Trusted South Indian matrimony for Tamil, Telugu, Kannada and Malayalam families. Verified photos, screened profiles, and matches rooted in tradition.",
  applicationName: "Astalakshimi",
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#8b1e3f",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${cormorant.variable} ${tiroTamil.variable}`}>
      <body className="kolam-surface antialiased min-h-dvh bg-background text-foreground">
        {children}
      </body>
    </html>
  )
}
