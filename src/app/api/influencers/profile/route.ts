import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const influencerProfileSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  bio: z.string().optional(),
  profileImage: z.string().url().optional().or(z.literal("")),
  location: z.string().optional(),
  languages: z.array(z.string()).default([]),
  timezone: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  contactEmail: z.string().email(),
  phone: z.string().optional(),
  niches: z.array(z.string()).default([]),
  platforms: z.array(z.object({
    platform: z.string(),
    handle: z.string(),
    followerCount: z.number().min(0),
    engagementRate: z.number().min(0).max(100),
  })).default([]),
  equipment: z.array(z.string()).default([]),
  collaborationPreferences: z.object({}).optional(),
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

    if (session.user.role !== "INFLUENCER") {
      return NextResponse.json(
        { message: "Access denied. Influencer role required." },
        { status: 403 }
      )
    }

    const influencerProfile = await prisma.influencerProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        user: {
          select: {
            email: true,
            role: true,
            status: true,
          }
        },
        platforms: true,
        portfolio: {
          take: 5,
          orderBy: { createdAt: 'desc' }
        }
      }
    })

    if (!influencerProfile) {
      return NextResponse.json(
        { message: "Influencer profile not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(influencerProfile)
  } catch (error) {
    console.error("Error fetching influencer profile:", error)
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

    if (session.user.role !== "INFLUENCER") {
      return NextResponse.json(
        { message: "Access denied. Influencer role required." },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = influencerProfileSchema.parse(body)

    // Check if influencer profile exists
    const existingProfile = await prisma.influencerProfile.findUnique({
      where: { userId: session.user.id }
    })

    let influencerProfile
    if (existingProfile) {
      // Update existing profile
      influencerProfile = await prisma.influencerProfile.update({
        where: { userId: session.user.id },
        data: validatedData,
        include: {
          user: {
            select: {
              email: true,
              role: true,
              status: true,
            }
          },
          platforms: true
        }
      })
    } else {
      // Create new profile
      influencerProfile = await prisma.influencerProfile.create({
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
          },
          platforms: true
        }
      })
    }

    // Handle platforms - update existing and create new ones
    if (validatedData.platforms && validatedData.platforms.length > 0) {
      // Delete existing platforms
      await prisma.platformProfile.deleteMany({
        where: { influencerProfileId: influencerProfile.id }
      })

      // Create new platforms
      await prisma.platformProfile.createMany({
        data: validatedData.platforms.map(platform => ({
          influencerProfileId: influencerProfile.id,
          platform: platform.platform.toUpperCase() as any, // Convert to enum
          handle: platform.handle,
          followerCount: platform.followerCount,
          engagementRate: platform.engagementRate,
        }))
      })
    }

    return NextResponse.json(influencerProfile)
  } catch (error) {
    console.error("Error updating influencer profile:", error)

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