import type { NextAuthConfig } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "OTP",
      credentials: {
        phone: { label: "Phone", type: "text" },
        otp: { label: "OTP", type: "text" }
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.otp) return null

        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
          // Call the NestJS backend to verify the OTP
          const res = await fetch(`${apiUrl}/auth/verify-otp`, {
            method: 'POST',
            body: JSON.stringify({
              phone: credentials.phone,
              otp: credentials.otp,
            }),
            headers: { "Content-Type": "application/json" }
          })

          const data = await res.json()

          if (res.ok && data?.accessToken) {
            // Return the user object along with the tokens so they can be stored in the session
            return {
              id: data.user?.id || 'user',
              ...data.user,
              accessToken: data.accessToken,
              refreshToken: data.refreshToken,
            }
          }
          return null
        } catch (e) {
          console.error("Authorize error:", e)
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      // If user object is available (on sign in), save the tokens to the JWT
      if (user) {
        token.accessToken = user.accessToken
        token.refreshToken = user.refreshToken
        token.user = user
      }
      return token
    },
    async session({ session, token }) {
      // Pass the access token to the client if needed
      // @ts-ignore
      session.accessToken = token.accessToken
      // @ts-ignore
      session.user = token.user as any
      return session
    }
  }
} satisfies NextAuthConfig
