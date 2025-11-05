import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const submissionSchema = z.object({
  contentType: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  mediaUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
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

    const contractId = params.id
    const body = await request.json()
    const validatedData = submissionSchema.parse(body)

    // Verify contract exists and user is the influencer
    const contract = await prisma.contract.findUnique({
      where: {
        id: contractId,
        influencerId: session.user.id,
        status: "ACTIVE"
      }
    })

    if (!contract) {
      return NextResponse.json(
        { message: "Contract not found or access denied" },
        { status: 404 }
      )
    }

    // Create submission
    const submission = await prisma.submission.create({
      data: {
        contractId,
        contentType: validatedData.contentType.toUpperCase() as any,
        title: validatedData.title,
        description: validatedData.description,
        mediaUrl: validatedData.mediaUrl,
        thumbnailUrl: validatedData.thumbnailUrl,
        status: "PENDING",
        submittedAt: new Date(),
      }
    })

    return NextResponse.json(submission, { status: 201 })
  } catch (error) {
    console.error("Error creating submission:", error)

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

    const contractId = params.id

    // Verify user has access to this contract
    const contract = await prisma.contract.findFirst({
      where: {
        id: contractId,
        OR: [
          { brandId: session.user.id },
          { influencerId: session.user.id }
        ]
      }
    })

    if (!contract) {
      return NextResponse.json(
        { message: "Contract not found or access denied" },
        { status: 404 }
      )
    }

    const submissions = await prisma.submission.findMany({
      where: { contractId },
      orderBy: { submittedAt: 'desc' }
    })

    return NextResponse.json(submissions)
  } catch (error) {
    console.error("Error fetching submissions:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}