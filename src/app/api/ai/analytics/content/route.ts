import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"
import { ContentAnalyzer } from "@/lib/ai/content-analyzer"
import { triggerNotification } from "@/lib/api/notifications/stream"

const contentAnalysisSchema = z.object({
  contentId: z.string(),
  contentType: z.enum(["image", "video", "audio", "text"]),
  analysisTypes: z.array(z.enum([
    "overview",
    "sentiment",
    "compliance",
    "quality",
    "performance",
    "visual"
  ]).default(["overview"])),
  timeframe: z.enum(["week", "month", "quarter", "year"]).default("month"),
  filters: z.object({
    campaignId: z.string().optional(),
    userId: z.string().optional(),
    contentType: z.string().optional(),
    minQualityScore: z.number().optional(),
    platforms: z.array(z.string()).optional(),
    dateRange: z.object({
      start: z.string(),
      end: z.string()
    }).optional()
  }).optional(),
  maxResults: z.number().default(50)
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { timeframe, filters, maxResults, analysisTypes } = contentAnalysisSchema.parse(body)

    if (!filters?.userId && !filters?.campaignId) {
      return NextResponse.json(
        { message: "Content analysis requires user or campaign context" },
        { status: 400 }
      )
    }

    // Fetch relevant content based on filters
    let whereClause: any = {}

    if (filters?.platforms && filters.platforms.length > 0) {
      const platformUserIds: string[] = []

      for (const platform of filters.platforms) {
        const platformQuery = await prisma.platformProfile.findMany({
          where: {
            platform: {
              platform: platform.toLowerCase()
            }
          },
          include: {
            influencer: {
              user: {
                id: true,
                brandProfile: true,
              }
            }
          }
        })

        const userIds = platformQuery.map(query => query?.influencer?.user?.id).filter(Boolean) as string[]
        platformUserIds.push(...userIds)
      }

      if (platformUserIds.length > 0) {
        whereClause = {
          influencer: {
            user: {
              id: { in: platformUserIds }
            }
          }
        }
      }
    }

    if (filters?.dateRange && filters.dateRange.start && filters.dateRange.end) {
      whereClause.createdAt = {
        gte: filters.dateRange.start,
        lte: filters.dateRange.end
      }
    }

    // Count total matching content
    const totalCount = await prisma.submission.count({
      where: whereClause
    })

    // Fetch paginated results
    const content = await prisma.submission.findMany({
      where: whereClause,
      include: {
        contract: {
          include: {
            campaign: {
              brand: {
                industry: true
              }
            },
            influencer: {
              user: {
                id: true,
                brandProfile: true,
                niches: true,
                platforms: true,
                trustScore: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: Math.min(maxResults, 10)
    })

    // Process content through AI analysis
    const analyzedContent = []

    for (const item of content) {
      try {
        const analyzer = new ContentAnalyzer()
        const analysis = await analyzer.analyzeContent({
          contentId: item.id,
          type: item.contentType,
          analysisType: analysisTypes[0] || "overview",
          timeframe: timeframe
        })

        analyzedContent.push(analysis)
      } catch (error) {
        console.error(`Error analyzing content ${item.id}:`, error)
        analyzedContent.push({
          id: item.id,
          contentType: item.contentType,
          analysisType: "overview",
          timestamp: new Date().toISOString(),
          score: 0.5,
          error: (error as Error).message
        })
      }
    }

    // Calculate aggregate insights
    const aggregateInsights = calculateAggregateInsights(analyzedContent)

    const response = {
      success: true,
      analysis: analyzedContent,
      aggregate_insights: aggregateInsights,
      totalContent: totalCount,
      analyzed_at: new Date().toISOString()
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error("Error in content analytics:", error)
    return NextResponse.json(
      { success: false, message: "Analysis failed" },
      { status: 500 }
    )
  }
}

interface ContentAnalysis {
  id: string
  contentType: string
  analysisType: string
  timestamp: string
  score?: number
  qualityScore?: number
  sentimentScore?: string
  performance_metrics?: {
    likes_prediction: number
    comments_prediction: number
    shares_prediction: number
    reach_prediction: number
  }
  error?: string
}

function calculateAggregateInsights(analyzedContent: ContentAnalysis[]) {
  if (analyzedContent.length === 0) {
    return {
      contentTypeBreakdown: {},
      sentimentBreakdown: {},
      averageScore: 0,
      contentQualityScore: 0,
      performanceMetrics: {
        likes_prediction: 0,
        comments_prediction: 0,
        shares_prediction: 0,
        reach_prediction: 0
      }
    }
  }

  const totalScore = analyzedContent.reduce((sum, item) => sum + (item.score || 0), 0) / analyzedContent.length

  const contentTypeBreakdown: Record<string, number> = analyzedContent.reduce((acc, item) => {
    const type = item.contentType
    acc[type] = (acc[type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const sentimentBreakdown: Record<string, number> = analyzedContent.reduce((acc, item) => {
    const sentimentType = item.sentimentScore || "neutral"
    acc[sentimentType] = (acc[sentimentType] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return {
    contentTypeBreakdown,
    sentimentBreakdown,
    averageScore: totalScore,
    contentQualityScore: analyzedContent.reduce((sum, item) => sum + (item.qualityScore || 0), 0) / analyzedContent.length,
    performanceMetrics: analyzedContent.reduce((acc, item) => ({
      likes_prediction: acc.likes_prediction + (item.performance_metrics?.likes_prediction || 0),
      comments_prediction: acc.comments_prediction + (item.performance_metrics?.comments_prediction || 0),
      shares_prediction: acc.shares_prediction + (item.performance_metrics?.shares_prediction || 0),
      reach_prediction: acc.reach_prediction + (item.performance_metrics?.reach_prediction || 0)
    }), {
      likes_prediction: 0,
      comments_prediction: 0,
      shares_prediction: 0,
      reach_prediction: 0
    })
  }
}