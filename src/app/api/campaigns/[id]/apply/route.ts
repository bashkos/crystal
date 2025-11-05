import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const applicationSchema = z.object({
  proposedRate: z.number().min(0).optional(),
  proposalText: z.string().min(1, "Proposal text is required"),
  timelineEstimate: z.string().optional(),
  mediaUrls: z.array(z.string().url()).optional(),
})

export async function POST(
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

    if (session.user.role !== "INFLUENCER") {
      return NextResponse.json(
        { message: "Access denied. Influencer role required." },
        { status: 403 }
      )
    }

    const campaignId = params.id
    const body = await request.json()
    const validatedData = applicationSchema.parse(body)

    // Verify campaign exists and is open
    const campaign = await prisma.campaign.findUnique({
      where: {
        id: campaignId,
        status: "OPEN",
        visibility: "PUBLIC"
      }
    })

    if (!campaign) {
      return NextResponse.json(
        { message: "Campaign not found or not accepting applications" },
        { status: 404 }
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

    // Check if already applied
    const existingApplication = await prisma.application.findUnique({
      where: {
        campaignId_influencerId: {
          campaignId,
          influencerId: influencerProfile.id
        }
      }
    })

    if (existingApplication) {
      return NextResponse.json(
        { message: "You have already applied to this campaign" },
        { status: 400 }
      )
    }

    // Create application
    const application = await prisma.application.create({
      data: {
        campaignId,
        influencerId: influencerProfile.id,
        proposedRate: validatedData.proposedRate,
        proposalText: validatedData.proposalText,
        timelineEstimate: validatedData.timelineEstimate,
        applicationData: {
          mediaUrls: validatedData.mediaUrls || [],
        },
        status: "SUBMITTED",
        submittedAt: new Date(),
      },
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
            brand: {
              select: {
                companyName: true,
                logo: true,
              }
            }
          }
        }
      }
    })

    return NextResponse.json(application, { status: 201 })
  } catch (error) {
    console.error("Error creating application:", error)

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