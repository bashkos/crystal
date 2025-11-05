import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const campaignSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  contentType: z.string().min(1, "Content type is required"),
  platform: z.string().min(1, "Platform is required"),
  requirements: z.string().optional(),
  deliverables: z.string().optional(),
  budgetMin: z.number().min(0).optional(),
  budgetMax: z.number().min(0).optional(),
  applicationDeadline: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  location: z.string().optional(),
  isRemote: z.boolean().optional(),
  status: z.enum(["DRAFT", "OPEN", "REVIEWING", "HIRING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
  visibility: z.enum(["PUBLIC", "INVITE_ONLY", "PRIVATE"]).optional(),
  influencerCount: z.number().min(1).optional(),
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

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const status = searchParams.get("status")
    const category = searchParams.get("category")

    // Build where clause based on user role
    let whereClause = {}

    if (session.user.role === "BRAND") {
      // Brands can only see their own campaigns
      whereClause = {
        brand: {
          userId: session.user.id
        }
      }
    } else if (session.user.role === "INFLUENCER") {
      // Influencers can see open campaigns
      whereClause = {
        status: "OPEN",
        visibility: "PUBLIC"
      }
    }

    // Add optional filters
    if (status) {
      whereClause = {
        ...whereClause,
        status
      }
    }

    if (category) {
      whereClause = {
        ...whereClause,
        category
      }
    }

    const skip = (page - 1) * limit

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where: whereClause,
        include: {
          brand: {
            select: {
              id: true,
              companyName: true,
              logo: true,
              industry: true,
              website: true
            }
          },
          _count: {
            select: {
              applications: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit,
      }),
      prisma.campaign.count({ where: whereClause })
    ])

    return NextResponse.json({
      campaigns,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("Error fetching campaigns:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
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

    // Get brand profile
    const brandProfile = await prisma.brandProfile.findUnique({
      where: { userId: session.user.id }
    })

    if (!brandProfile) {
      return NextResponse.json(
        { message: "Brand profile not found" },
        { status: 404 }
      )
    }

    const body = await request.json()
    const validatedData = campaignSchema.parse(body)

    // Create campaign
    const campaign = await prisma.campaign.create({
      data: {
        brandId: brandProfile.id,
        title: validatedData.title,
        description: validatedData.description,
        category: validatedData.category,
        contentType: validatedData.contentType.toUpperCase() as any,
        platform: validatedData.platform.toUpperCase() as any,
        requirements: validatedData.requirements ? JSON.parse(validatedData.requirements) : {},
        deliverables: validatedData.deliverables ? JSON.parse(validatedData.deliverables) : [],
        budgetMin: validatedData.budgetMin,
        budgetMax: validatedData.budgetMax,
        applicationDeadline: validatedData.applicationDeadline ? new Date(validatedData.applicationDeadline) : null,
        startDate: validatedData.startDate ? new Date(validatedData.startDate) : null,
        endDate: validatedData.endDate ? new Date(validatedData.endDate) : null,
        location: validatedData.location,
        isRemote: validatedData.isRemote ?? true,
        status: validatedData.status || "DRAFT",
        visibility: (validatedData.visibility || "PUBLIC") as any,
        influencerCount: validatedData.influencerCount || 1,
      },
      include: {
        brand: {
          select: {
            id: true,
            companyName: true,
            logo: true,
            industry: true,
            website: true
          }
        }
      }
    })

    return NextResponse.json(campaign, { status: 201 })
  } catch (error) {
    console.error("Error creating campaign:", error)

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