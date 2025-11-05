import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const reviewSchema = z.object({
  contractId: z.string(),
  ratingScores: z.object({
    // Brand ratings for influencers
    contentQuality: z.number().min(1).max(5).optional(),
    professionalism: z.number().min(1).max(5).optional(),
    communication: z.number().min(1).max(5).optional(),
    collaboration: z.number().min(1).max(5).optional(),
    timeliness: z.number().min(1).max(5).optional(),
    creativity: z.number().min(1).max(5).optional(),
    adherence: z.number().min(1).max(5).optional(),
    overallSatisfaction: z.number().min(1).max(5),

    // Influencer ratings for brands
    clarity: z.number().min(1).max(5).optional(),
    fairness: z.number().min(1).max(5).optional(),
    communicationQuality: z.number().min(1).max(5).optional(),
    promptness: z.number().min(1).max(5).optional(),
    respect: z.number().min(1).max(5).optional(),
    flexibility: z.number().min(1).max(5).optional(),
    paymentTimeliness: z.number().min(1).max(5).optional(),
    creativeFreedom: z.number().min(1).max(5).optional(),
  }),
  reviewText: z.string().min(10, "Review text must be at least 10 characters"),
  recommendationScore: z.number().min(1).max(10, "Recommendation score must be between 1 and 10"),
  isPublic: z.boolean().default(true),
  tags: z.array(z.string()).optional(),
})

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = reviewSchema.parse(body)

    // Get contract and verify user can review
    const contract = await prisma.contract.findUnique({
      where: { id: validatedData.contractId },
      include: {
        brand: true,
        influencer: true,
        submissions: true,
      }
    })

    if (!contract) {
      return NextResponse.json(
        { message: "Contract not found" },
        { status: 404 }
      )
    }

    // Verify contract is completed
    if (contract.status !== "COMPLETED") {
      return NextResponse.json(
        { message: "Can only review completed contracts" },
        { status: 400 }
      )
    }

    // Determine who is reviewing and who is being reviewed
    let reviewerId: string
    let revieweeId: string

    if (session.user.role === "BRAND") {
      reviewerId = contract.brandId
      revieweeId = contract.influencerId
    } else if (session.user.role === "INFLUENCER") {
      reviewerId = contract.influencerId
      revieweeId = contract.brandId
    } else {
      return NextResponse.json(
        { message: "Invalid user role for reviewing" },
        { status: 403 }
      )
    }

    // Check if reviewer is part of this contract
    if (reviewerId !== session.user.id) {
      return NextResponse.json(
        { message: "You can only review contracts you participated in" },
        { status: 403 }
      )
    }

    // Check if review already exists
    const existingReview = await prisma.review.findUnique({
      where: {
        contractId_reviewerId: {
          contractId: validatedData.contractId,
          reviewerId
        }
      }
    })

    if (existingReview) {
      return NextResponse.json(
        { message: "You have already reviewed this contract" },
        { status: 400 }
      )
    }

    // Calculate overall score from rating scores
    const ratings = Object.values(validatedData.ratingScores).filter(r => r !== undefined) as number[]
    const averageScore = ratings.reduce((sum, score) => sum + score, 0) / ratings.length

    // Create review
    const review = await prisma.review.create({
      data: {
        contractId: validatedData.contractId,
        reviewerId,
        revieweeId,
        ratingScores: validatedData.ratingScores,
        reviewText: validatedData.reviewText,
        recommendationScore: validatedData.recommendationScore,
        isPublic: validatedData.isPublic,
        createdAt: new Date(),
      }
    })

    // Update reviewee's trust score
    await updateTrustScore(revieweeId, session.user.role)

    return NextResponse.json(review, { status: 201 })
  } catch (error) {
    console.error("Error creating review:", error)

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
    const userId = searchParams.get("userId")
    const contractId = searchParams.get("contractId")
    const isPublic = searchParams.get("public") === "true"

    // Build where clause
    let whereClause: any = {}

    if (userId) {
      // Get reviews for a specific user (as reviewee)
      whereClause.revieweeId = userId
      if (isPublic) {
        whereClause.isPublic = true
      }
    } else if (contractId) {
      // Get reviews for a specific contract
      whereClause.contractId = contractId
    } else if (session.user.role === "ADMIN") {
      // Admins can see all reviews
      // No additional filtering needed
    } else {
      // Regular users can only see reviews they wrote or received
      whereClause.OR = [
        { reviewerId: session.user.id },
        { revieweeId: session.user.id, isPublic: true }
      ]
    }

    const skip = (page - 1) * limit

    const reviews = await prisma.review.findMany({
      where: whereClause,
      include: {
        reviewer: {
          select: {
            id: true,
            email: true,
            role: true,
            brandProfile: {
              select: {
                companyName: true,
                logo: true
              }
            },
            influencerProfile: {
              select: {
                firstName: true,
                lastName: true,
                profileImage: true
              }
            }
          }
        },
        reviewee: {
          select: {
            id: true,
            email: true,
            role: true,
            brandProfile: {
              select: {
                companyName: true,
                logo: true
              }
            },
            influencerProfile: {
              select: {
                firstName: true,
                lastName: true,
                profileImage: true
              }
            }
          }
        },
        contract: {
          select: {
            id: true,
            campaign: {
              select: {
                title: true,
                category: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit,
    })

    const total = await prisma.review.count({ where: whereClause })

    return NextResponse.json({
      reviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("Error fetching reviews:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

async function updateTrustScore(userId: string, reviewerRole: string) {
  try {
    const reviews = await prisma.review.findMany({
      where: {
        revieweeId: userId,
        isPublic: true
      }
    })

    if (reviews.length === 0) return

    // Calculate weighted trust score
    let totalScore = 0
    let totalWeight = 0

    reviews.forEach(review => {
      const scores = Object.values(review.ratingScores).filter(r => r !== undefined) as number[]
      if (scores.length > 0) {
        const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length
        const weight = review.recommendationScore / 10 // Use recommendation as weight
        totalScore += averageScore * weight
        totalWeight += weight
      }
    })

    const trustScore = totalWeight > 0 ? totalScore / totalWeight : 0

    // Update user's trust score in their profile
    if (reviewerRole === "BRAND") {
      await prisma.influencerProfile.update({
        where: { userId },
        data: { trustScore }
      })
    } else {
      await prisma.brandProfile.update({
        where: { userId },
        data: { trustScore }
      })
    }
  } catch (error) {
    console.error("Error updating trust score:", error)
  }
}