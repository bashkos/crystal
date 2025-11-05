import { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import GoogleProvider from "next-auth/providers/google"
import LinkedInProvider from "next-auth/providers/linkedin"
import InstagramProvider from "next-auth/providers/instagram"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "./db"

export const authOptions: NextAuthOptions = {
  // adapter: PrismaAdapter(prisma), // Temporarily disabled due to type compatibility issues
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    LinkedInProvider({
      clientId: process.env.LINKEDIN_CLIENT_ID!,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET!,
      authorization: {
        params: { scope: "r_emailaddress r_liteprofile" }
      }
    }),
    InstagramProvider({
      clientId: process.env.INSTAGRAM_CLIENT_ID!,
      clientSecret: process.env.INSTAGRAM_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "user_profile,user_media",
          display: "page"
        }
      }
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: {
            brandProfile: true,
            influencerProfile: true,
          }
        })

        if (!user || !user.passwordHash) {
          return null
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        )

        if (!isValidPassword) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.brandProfile?.companyName ||
                user.influencerProfile?.firstName + " " + user.influencerProfile?.lastName ||
                user.email.split('@')[0],
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.role = user.role
        token.id = user.id
      }

      // Store OAuth account info if applicable
      if (account) {
        token.provider = account.provider
      }

      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.provider = token.provider as string
      }
      return session
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === "credentials") {
        return true
      }

      // Handle OAuth providers - check if user exists or create new user
      if (account?.provider === "google") {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email! }
          })

          if (existingUser) {
            // Link Google account if not already linked
            if (!existingUser.googleId) {
              await prisma.user.update({
                where: { id: existingUser.id },
                data: { googleId: account.providerAccountId }
              })
            }
          } else {
            // Create new user with Google account
            await prisma.user.create({
              data: {
                email: user.email!,
                googleId: account.providerAccountId,
                role: "UNVERIFIED",
                status: "PENDING",
                emailVerified: new Date(),
              }
            })
          }
        } catch (error) {
          console.error("Error during Google sign in:", error)
          return false
        }
      }

      // Similar logic for LinkedIn and Instagram
      if (account?.provider === "linkedin") {
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email! }
          })

          if (existingUser && !existingUser.linkedinId) {
            await prisma.user.update({
              where: { id: existingUser.id },
              data: { linkedinId: account.providerAccountId }
            })
          } else if (!existingUser) {
            await prisma.user.create({
              data: {
                email: user.email!,
                linkedinId: account.providerAccountId,
                role: "UNVERIFIED",
                status: "PENDING",
                emailVerified: new Date(),
              }
            })
          }
        } catch (error) {
          console.error("Error during LinkedIn sign in:", error)
          return false
        }
      }

      return true
    }
  },
  pages: {
    signIn: "/auth/signin",
    signUp: "/auth/signup",
    error: "/auth/error",
  },
}