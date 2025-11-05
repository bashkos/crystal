import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const campaignId = params.id

    // Build where clause based on user role
    let whereClause: any = { id: campaignId }

    if (session.user.role === "BRAND") {
      // Brands can only see their own campaigns
      whereClause = {
        ...whereClause,
        brand: {
          userId: session.user.id
        }
      }
    } else if (session.user.role === "INFLUENCER") {
      // Influencers can only see open campaigns
      whereClause = {
        ...whereClause,
        status: "OPEN",
        visibility: "PUBLIC"
      }
    }

    const campaign = await prisma.campaign.findUnique({
      where: whereClause,
      include: {
        brand: {
          select: {
            id: true,
            companyName: true,
            logo: true,
            industry: true,
            website: true,
            companyDescription: true,
            verificationStatus: true,
          }
        },
        _count: {
          select: {
            applications: true
          }
        }
      }
    })

    if (!campaign) {
      return NextResponse.json(
        { message: "Campaign not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(campaign)
  } catch (error) {
    console.error("Error fetching campaign:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    const campaignId = params.id
    const body = await request.json()

    // Verify campaign belongs to the brand
    const existingCampaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        brand: {
          userId: session.user.id
        }
      }
    })

    if (!existingCampaign) {
      return NextResponse.json(
        { message: "Campaign not found or access denied" },
        { status: 404 }
      )
    }

    // Update campaign
    const campaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        ...body,
        startDate: body.startDate ? new Date(body.startDate) : undefined,
        endDate: body.endDate ? new Date(body.endDate) : undefined,
        applicationDeadline: body.applicationDeadline ? new Date(body.applicationDeadline) : undefined,
        updatedAt: new Date(),
      },
      include: {
        brand: {
          select: {
            id: true,
            companyName: true,
            logo: true,
            industry: true,
            website: true,
          }
        },
        _count: {
          select: {
            applications: true
          }
        }
      }
    })

    return NextResponse.json(campaign)
  } catch (error) {
    console.error("Error updating campaign:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
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

    const campaignId = params.id

    // Verify campaign belongs to the brand and has no active contracts
    const existingCampaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        brand: {
          userId: session.user.id
        }
      },
      include: {
        _count: {
          select: {
            contracts: true,
            applications: true
          }
        }
      }
    })

    if (!existingCampaign) {
      return NextResponse.json(
        { message: "Campaign not found or access denied" },
        { status: 404 }
      )
    }

    if (existingCampaign._count.contracts > 0) {
      return NextResponse.json(
        { message: "Cannot delete campaign with active contracts" },
        { status: 400 }
      )
    }

    // Delete campaign (cascade will handle applications)
    await prisma.campaign.delete({
      where: { id: campaignId }
    })

    return NextResponse.json(
      { message: "Campaign deleted successfully" },
      { status: 200 }
    )
  } catch (error) {
    console.error("Error deleting campaign:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}