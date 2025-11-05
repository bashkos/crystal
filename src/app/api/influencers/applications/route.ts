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

    if (session.user.role !== "INFLUENCER") {
      return NextResponse.json(
        { message: "Access denied. Influencer role required." },
        { status: 403 }
      )
    }

    // Get influencer profile
    const influencerProfile = await prisma.influencerProfile.findUnique({
      where: { userId: session.user.id }
    })

    if (!influencerProfile) {
      return NextResponse.json(
        { message: "Influencer profile not found" },
        { status: 404 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const search = searchParams.get("search")

    // Build where clause
    let whereClause: any = {
      influencerId: influencerProfile.id
    }

    if (status) {
      whereClause.status = status
    }

    if (search) {
      whereClause.campaign = {
        title: { contains: search, mode: "insensitive" }
      }
    }

    const applications = await prisma.application.findMany({
      where: whereClause,
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
            category: true,
            budgetMin: true,
            budgetMax: true,
            brand: {
              select: {
                companyName: true,
                logo: true,
                verificationStatus: true
              }
            }
          }
        }
      },
      orderBy: {
        submittedAt: 'desc'
      }
    })

    return NextResponse.json(applications)
  } catch (error) {
    console.error("Error fetching influencer applications:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}