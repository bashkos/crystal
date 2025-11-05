import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"
import { z } from "zod"

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["BRAND", "INFLUENCER"]),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  companyName: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, role, firstName, lastName, companyName } = registerSchema.parse(body)

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { message: "User with this email already exists" },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: role as any,
        status: "PENDING",
        emailVerified: new Date(), // For demo, auto-verify email
      },
    })

    // Create profile based on role
    if (role === "BRAND") {
      await prisma.brandProfile.create({
        data: {
          userId: user.id,
          companyName: companyName || "Unknown Company",
          contactEmail: email,
          verificationStatus: "PENDING",
        },
      })
    } else if (role === "INFLUENCER") {
      await prisma.influencerProfile.create({
        data: {
          userId: user.id,
          firstName: firstName || "Unknown",
          lastName: lastName || "Influencer",
          contactEmail: email,
          verificationStatus: "PENDING",
          languages: ["English"],
        },
      })
    }

    return NextResponse.json(
      { message: "User created successfully" },
      { status: 201 }
    )
  } catch (error) {
    console.error("Registration error:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid input data", errors: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}