import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

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

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const search = searchParams.get("search")

    // Build where clause
    let whereClause: any = {
      campaign: {
        brandId: brandProfile.id
      }
    }

    if (status) {
      whereClause.status = status
    }

    if (search) {
      whereClause.influencer = {
        OR: [
          { firstName: { contains: search, mode: "insensitive" } },
          { lastName: { contains: search, mode: "insensitive" } },
        ]
      }
    }

    const applications = await prisma.application.findMany({
      where: whereClause,
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
            status: true
          }
        },
        influencer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profileImage: true,
            followerCount: true,
            engagementRate: true
          }
        }
      },
      orderBy: {
        submittedAt: 'desc'
      }
    })

    return NextResponse.json({ applications })
  } catch (error) {
    console.error("Error fetching brand applications:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}