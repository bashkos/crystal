import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const brandProfileSchema = z.object({
  companyName: z.string().min(1),
  companyDescription: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  industry: z.string().optional(),
  companySize: z.string().optional(),
  logo: z.string().url().optional().or(z.literal("")),
  contactEmail: z.string().email(),
  phone: z.string().optional(),
  address: z.string().optional(),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  twitterUrl: z.string().url().optional().or(z.literal("")),
  facebookUrl: z.string().url().optional().or(z.literal("")),
  campaignPreferences: z.object({}).optional(),
})

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    if (session.user.role !== "BRAND") {
      return NextResponse.json(
        { message: "Access denied. Brand role required." },
        { status: 403 }
      )
    }

    const brandProfile = await prisma.brandProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        user: {
          select: {
            email: true,
            role: true,
            status: true,
          }
        }
      }
    })

    if (!brandProfile) {
      return NextResponse.json(
        { message: "Brand profile not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(brandProfile)
  } catch (error) {
    console.error("Error fetching brand profile:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    if (session.user.role !== "BRAND") {
      return NextResponse.json(
        { message: "Access denied. Brand role required." },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = brandProfileSchema.parse(body)

    // Check if brand profile exists
    const existingProfile = await prisma.brandProfile.findUnique({
      where: { userId: session.user.id }
    })

    let brandProfile
    if (existingProfile) {
      // Update existing profile
      brandProfile = await prisma.brandProfile.update({
        where: { userId: session.user.id },
        data: validatedData,
        include: {
          user: {
            select: {
              email: true,
              role: true,
              status: true,
            }
          }
        }
      })
    } else {
      // Create new profile
      brandProfile = await prisma.brandProfile.create({
        data: {
          userId: session.user.id,
          ...validatedData,
          verificationStatus: "PENDING",
        },
        include: {
          user: {
            select: {
              email: true,
              role: true,
              status: true,
            }
          }
        }
      })
    }

    return NextResponse.json(brandProfile)
  } catch (error) {
    console.error("Error updating brand profile:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid input data", errors: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}