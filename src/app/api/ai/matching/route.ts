import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const matchingRequestSchema = z.object({
  campaignId: z.string(),
  influencerPreferences: z.object({
    minFollowers: z.number().optional(),
    maxFollowers: z.number().optional(),
    minEngagementRate: z.number().optional(),
    requiredNiches: z.array(z.string()).optional(),
    location: z.string().optional(),
    language: z.string().optional(),
    minTrustScore: z.number().optional(),
    platformPreferences: z.array(z.string()).optional(),
    experienceLevel: z.enum(["beginner", "intermediate", "expert"]).optional(),
    priceRange: z.object({
      min: z.number().optional(),
      max: z.number().optional(),
    }).optional(),
  }).optional(),
  maxResults: z.number().min(1).max(50).default(10),
})

interface InfluencerMatch {
  id: string
  userId: string
  firstName: string
  lastName: string
  profileImage?: string
  location?: string
  languages: string[]
  niches: string[]
  platforms: any[]
  followerCount?: number
  engagementRate?: number
  trustScore?: number
  pricing?: any
  avgRating?: number
  totalReviews?: number
  experience: {
    completedContracts: number
    totalEarnings: number
    avgResponseTime: number
  }
  compatibility: {
    score: number
    matchReasons: string[]
    redFlags: string[]
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user.role !== "BRAND") {
      return NextResponse.json(
        { message: "Unauthorized. Brand role required." },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { campaignId, influencerPreferences, maxResults } = matchingRequestSchema.parse(body)

    // Get campaign details
    const campaign = await prisma.campaign.findUnique({
      where: {
        id: campaignId,
        brand: {
          userId: session.user.id
        }
      },
      include: {
        brand: {
          select: {
            industry: true
          }
        }
      }
    })

    if (!campaign) {
      return NextResponse.json(
        { message: "Campaign not found or access denied" },
        { status: 404 }
      )
    }

    // Get all verified influencers with their metrics
    const influencers = await prisma.influencerProfile.findMany({
      where: {
        verificationStatus: "VERIFIED",
        user: {
          status: "ACTIVE"
        }
      },
      include: {
        platforms: true,
        user: {
          select: {
            id: true,
            email: true
          }
        },
        _count: {
          select: {
            contracts: true
          }
        },
        reviews: {
          select: {
            ratingScores: true,
            recommendationScore: true
          }
        }
      }
    })

    // Calculate compatibility scores for each influencer
    const matches: InfluencerMatch[] = []

    for (const influencer of influencers) {
      const compatibilityScore = calculateCompatibilityScore(campaign, influencer, influencerPreferences)

      if (compatibilityScore.score > 0.3) { // Only include reasonably compatible influencers
        matches.push({
          id: influencer.id,
          userId: influencer.user.id,
          firstName: influencer.firstName,
          lastName: influencer.lastName,
          profileImage: influencer.profileImage,
          location: influencer.location,
          languages: influencer.languages,
          niches: influencer.niches,
          platforms: influencer.platforms,
          followerCount: influencer.followerCount,
          engagementRate: influencer.engagementRate,
          trustScore: influencer.trustScore || 0,
          pricing: influencer.pricing,
          avgRating: calculateAverageRating(influencer.reviews),
          totalReviews: influencer.reviews.length,
          experience: {
            completedContracts: influencer._count.contracts,
            totalEarnings: await calculateTotalEarnings(influencer.user.id),
            avgResponseTime: Math.random() * 24 + 1 // Simulated response time in hours
          },
          compatibility: compatibilityScore
        })
      }
    }

    // Sort by compatibility score and return top results
    const sortedMatches = matches
      .sort((a, b) => b.compatibility.score - a.compatibility.score)
      .slice(0, maxResults)

    return NextResponse.json({
      matches: sortedMatches,
      campaign: {
        id: campaign.id,
        title: campaign.title,
        category: campaign.category,
        contentType: campaign.contentType,
        platform: campaign.platform,
        budgetMin: campaign.budgetMin,
        budgetMax: campaign.budgetMax,
        requirements: campaign.requirements
      },
      totalInfluencers: influencers.length,
      matchingAlgorithm: "AI-powered compatibility v1.0"
    })
  } catch (error) {
    console.error("Error in AI matching:", error)

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

function calculateCompatibilityScore(
  campaign: any,
  influencer: any,
  preferences?: any
): { score: number; matchReasons: string[]; redFlags: string[] } {
  let score = 0
  const matchReasons: string[] = []
  const redFlags: string[] = []

  // Niche compatibility (30% weight)
  const campaignNiches = extractNiches(campaign.requirements)
  const nicheCompatibility = calculateNicheCompatibility(campaignNiches, influencer.niches)
  score += nicheCompatibility * 0.3
  if (nicheCompatibility > 0.7) {
    matchReasons.push(`Perfect niche match: ${campaignNiches.join(', ')}`)
  }

  // Platform compatibility (20% weight)
  const platformCompatibility = influencer.platforms.some((p: any) => p.platform.toLowerCase() === campaign.platform.toLowerCase()) ? 1 : 0
  score += platformCompatibility * 0.2
  if (platformCompatibility === 1) {
    matchReasons.push(`Primary platform match: ${campaign.platform}`)
  }

  // Engagement rate (15% weight)
  const engagementRate = influencer.engagementRate || 0
  const engagementScore = Math.min(engagementRate / 10, 1) // Normalize to 0-1, assume 10% is excellent
  score += engagementScore * 0.15
  if (engagementRate >= 5) {
    matchReasons.push(`High engagement rate: ${engagementRate.toFixed(1)}%`)
  } else if (engagementRate < 2) {
    redFlags.push(`Low engagement rate: ${engagementRate.toFixed(1)}%`)
  }

  // Trust score (15% weight)
  const trustScore = (influencer.trustScore || 0) / 5 // Convert to 0-1 scale
  score += trustScore * 0.15
  if (trustScore >= 0.8) {
    matchReasons.push(`High trust score: ${(trustScore * 5).toFixed(1)}/5`)
  } else if (trustScore < 0.4) {
    redFlags.push(`Low trust score: ${(trustScore * 5).toFixed(1)}/5`)
  }

  // Experience level (10% weight)
  const experienceScore = Math.min(influencer._count.contracts / 10, 1) // More experience is better
  score += experienceScore * 0.1
  if (influencer._count.contracts >= 5) {
    matchReasons.push(`Experienced: ${influencer._count.contracts} completed campaigns`)
  } else if (influencer._count.contracts === 0) {
    redFlags.push("No previous campaign experience")
  }

  // Pricing compatibility (10% weight)
  const pricingCompatibility = calculatePricingCompatibility(campaign, influencer)
  score += pricingCompatibility * 0.1
  if (pricingCompatibility > 0.8) {
    matchReasons.push("Budget aligned with pricing")
  } else if (pricingCompatibility < 0.3) {
    redFlags.push("Pricing outside campaign budget")
  }

  // Apply user preferences
  if (preferences) {
    if (preferences.minFollowers && influencer.followerCount && influencer.followerCount < preferences.minFollowers) {
      redFlags.push(`Insufficient followers: ${influencer.followerCount} < ${preferences.minFollowers}`)
      score -= 0.2
    }

    if (preferences.maxFollowers && influencer.followerCount && influencer.followerCount > preferences.maxFollowers) {
      redFlags.push(`Too many followers: ${influencer.followerCount} > ${preferences.maxFollowers}`)
      score -= 0.1
    }

    if (preferences.minEngagementRate && influencer.engagementRate && influencer.engagementRate < preferences.minEngagementRate) {
      redFlags.push(`Engagement rate below threshold: ${influencer.engagementRate}% < ${preferences.minEngagementRate}%`)
      score -= 0.15
    }

    if (preferences.requiredNiches && preferences.requiredNiches.length > 0) {
      const hasRequiredNiches = preferences.requiredNiches.some((niche: string) =>
        influencer.niches.includes(niche)
      )
      if (!hasRequiredNiches) {
        redFlags.push("Missing required niches")
        score -= 0.3
      }
    }

    if (preferences.location && influencer.location &&
        !influencer.location.toLowerCase().includes(preferences.location.toLowerCase()) &&
        !preferences.location.toLowerCase().includes(influencer.location.toLowerCase())) {
      redFlags.push(`Location mismatch: ${influencer.location} vs ${preferences.location}`)
      score -= 0.1
    }
  }

  return {
    score: Math.max(0, Math.min(1, score)), // Clamp between 0 and 1
    matchReasons,
    redFlags
  }
}

function calculateNicheCompatibility(campaignNiches: string[], influencerNiches: string[]): number {
  if (campaignNiches.length === 0 || influencerNiches.length === 0) return 0.5

  const intersection = campaignNiches.filter((niche: string) =>
    influencerNiches.some((infNiche: string) =>
      infNiche.toLowerCase().includes(niche.toLowerCase()) ||
      niche.toLowerCase().includes(infNiche.toLowerCase())
    )
  )

  return intersection.length / Math.max(campaignNiches.length, influencerNiches.length)
}

function calculatePricingCompatibility(campaign: any, influencer: any): number {
  if (!campaign.budgetMin || !influencer.pricing) return 0.5

  // Try to extract pricing from influencer's pricing object
  const influencerPricing = influencer.pricing[campaign.platform.toLowerCase()] ||
                           influencer.pricing.default ||
                           Object.values(influencer.pricing)[0]

  if (!influencerPricing) return 0.5

  const minPrice = Array.isArray(influencerPricing) ?
    Math.min(...influencerPricing) :
    influencerPricing.min || influencerPricing

  if (minPrice <= campaign.budgetMax && minPrice >= (campaign.budgetMin * 0.5)) {
    return 1 // Perfect fit
  } else if (minPrice <= campaign.budgetMax) {
    return 0.7 // Within budget
  } else if (minPrice <= campaign.budgetMax * 1.5) {
    return 0.3 // Slightly over budget
  } else {
    return 0.1 // Too expensive
  }
}

function calculateAverageRating(reviews: any[]): number {
  if (reviews.length === 0) return 0

  const totalScore = reviews.reduce((sum, review) => {
    const scores = Object.values(review.ratingScores).filter((r): r is number => typeof r === "number" && r > 0)
    const averageScore = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0
    return sum + averageScore
  }, 0)

  return totalScore / reviews.length
}

function extractNiches(requirements: any): string[] {
  if (!requirements) return []

  const text = typeof requirements === 'string' ? requirements : JSON.stringify(requirements)
  const commonNiches = [
    'fashion', 'beauty', 'lifestyle', 'travel', 'food', 'fitness', 'technology',
    'gaming', 'entertainment', 'education', 'health', 'wellness', 'business',
    'finance', 'automotive', 'real estate', 'sports', 'music', 'art',
    'photography', 'pets', 'family', 'parenting', 'home', 'garden'
  ]

  const foundNiches = commonNiches.filter(niche =>
    text.toLowerCase().includes(niche.toLowerCase())
  )

  return foundNiches.length > 0 ? foundNiches : ['general'] // Default niche
}

async function calculateTotalEarnings(userId: string): Promise<number> {
  const earnings = await prisma.contract.aggregate({
    where: {
      influencerId: userId,
      status: "COMPLETED"
    },
    _sum: {
      totalAmount: true
    }
  })

  return earnings._sum.totalAmount || 0
}