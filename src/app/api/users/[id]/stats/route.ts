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

    const userId = params.id

    // Users can only see their own stats unless they're admins
    if (userId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Access denied" },
        { status: 403 }
      )
    }

    // Get reviews given by this user
    const reviewsGiven = await prisma.review.findMany({
      where: { reviewerId: userId },
      include: {
        reviewee: {
          select: {
            role: true
          }
        }
      }
    })

    // Get reviews received by this user
    const reviewsReceived = await prisma.review.findMany({
      where: { revieweeId: userId, isPublic: true },
      include: {
        reviewer: {
          select: {
            role: true
          }
        }
      }
    })

    // Calculate average rating for reviews given
    let totalRatingGiven = 0
    let ratingCount = 0
    let totalRecommendationGiven = 0

    reviewsGiven.forEach(review => {
      const scores = Object.values(review.ratingScores).filter((r): r is number => typeof r === "number" && r > 0)
      if (scores.length > 0) {
        totalRatingGiven += scores.reduce((sum, score) => sum + score, 0) / scores.length
        ratingCount++
      }
      totalRecommendationGiven += review.recommendationScore || 0
    })

    // Calculate average rating for reviews received
    let totalRatingReceived = 0
    let ratingReceivedCount = 0
    let totalRecommendationReceived = 0

    reviewsReceived.forEach(review => {
      const scores = Object.values(review.ratingScores).filter((r): r is number => typeof r === "number" && r > 0)
      if (scores.length > 0) {
        totalRatingReceived += scores.reduce((sum, score) => sum + score, 0) / scores.length
        ratingReceivedCount++
      }
      totalRecommendationReceived += review.recommendationScore || 0
    })

    // Get trust score from profile
    let trustScore = 0
    try {
      if (session.user.role === "INFLUENCER") {
        const influencerProfile = await prisma.influencerProfile.findUnique({
          where: { userId },
          select: { trustScore: true }
        })
        trustScore = influencerProfile?.trustScore || 0
      } else if (session.user.role === "BRAND") {
        const brandProfile = await prisma.brandProfile.findUnique({
          where: { userId },
          select: { trustScore: true }
        })
        trustScore = brandProfile?.trustScore || 0
      }
    } catch (error) {
      console.error("Error fetching trust score:", error)
    }

    const stats = {
      totalReviews: reviewsGiven.length,
      averageRating: ratingCount > 0 ? totalRatingGiven / ratingCount : 0,
      averageRecommendation: reviewsGiven.length > 0 ? totalRecommendationGiven / reviewsGiven.length : 0,
      totalReviewsReceived: reviewsReceived.length,
      averageRatingReceived: ratingReceivedCount > 0 ? totalRatingReceived / ratingReceivedCount : 0,
      averageRecommendationReceived: reviewsReceived.length > 0 ? totalRecommendationReceived / reviewsReceived.length : 0,
      trustScore,
      helpfulVotes: reviewsReceived.reduce((sum, review) => sum + review.helpfulVotes, 0)
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error("Error fetching user stats:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}