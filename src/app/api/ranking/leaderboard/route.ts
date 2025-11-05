import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { InfluencerRankingSystem } from "@/lib/ranking/influencer-ranking"
import { z } from "zod"

const leaderboardQuerySchema = z.object({
  type: z.enum(["global", "niche", "category"]).default("global"),
  niche: z.string().optional(),
  category: z.string().optional(),
  timeRange: z.enum(["week", "month", "quarter", "year"]).default("month"),
  limit: z.number().default(50)
})

const influencerRankSchema = z.object({
  influencerId: z.string()
})

const rankingHistorySchema = z.object({
  influencerId: z.string(),
  timeRange: z.enum(["week", "month", "quarter", "year"]).default("month")
})

const rankingSystem = new InfluencerRankingSystem()

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user?.role === "UNVERIFIED") {
      return NextResponse.json(
        { message: "Access denied. Please login and verify your account" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const query = leaderboardQuerySchema.parse({
      type: searchParams.get("type") || "global",
      niche: searchParams.get("niche") || undefined,
      category: searchParams.get("category") || undefined,
      timeRange: searchParams.get("timeRange") || "month",
      limit: parseInt(searchParams.get("limit") || "50")
    })

    const endpoint = searchParams.get("endpoint")

    if (endpoint === "stats") {
      // Get ranking statistics
      const stats = await rankingSystem.getRankingStats()
      return NextResponse.json({
        success: true,
        stats
      })
    }

    if (endpoint === "history" && searchParams.get("influencerId")) {
      // Get influencer ranking history
      const historyQuery = rankingHistorySchema.parse({
        influencerId: searchParams.get("influencerId")!,
        timeRange: searchParams.get("timeRange") || "month"
      })

      const history = await rankingSystem.getInfluencerRankHistory(
        historyQuery.influencerId,
        historyQuery.timeRange
      )

      return NextResponse.json({
        success: true,
        history
      })
    }

    if (endpoint === "current" && searchParams.get("influencerId")) {
      // Get current influencer rank
      const rankQuery = influencerRankSchema.parse({
        influencerId: searchParams.get("influencerId")!
      })

      try {
        const currentRank = await rankingSystem.calculateInfluencerRank(rankQuery.influencerId)
        return NextResponse.json({
          success: true,
          rank: currentRank
        })
      } catch (error) {
        return NextResponse.json({
          success: false,
          message: "Influencer not found or ranking unavailable"
        }, { status: 404 })
      }
    }

    // Default: Get leaderboard
    const leaderboard = await rankingSystem.getLeaderboard(query.type, {
      niche: query.niche,
      category: query.category,
      timeRange: query.timeRange,
      limit: query.limit
    })

    return NextResponse.json({
      success: true,
      leaderboard,
      filters: {
        type: query.type,
        niche: query.niche,
        category: query.category,
        timeRange: query.timeRange,
        limit: query.limit
      }
    })
  } catch (error) {
    console.error("Error in ranking API:", error)
    return NextResponse.json(
      { message: "Failed to fetch ranking data" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user?.role === "UNVERIFIED") {
      return NextResponse.json(
        { message: "Access denied. Please login and verify your account" },
        { status: 403 }
      )
    }

    const body = await request.json()

    if (body.action === "refresh") {
      const { influencerId } = body

      if (!influencerId) {
        return NextResponse.json(
          { message: "Influencer ID is required" },
          { status: 400 }
        )
      }

      // Verify user can refresh this influencer's rank
      const canRefresh = await this.canRefreshRank(session.user.id, influencerId, session.user.role)

      if (!canRefresh) {
        return NextResponse.json(
          { message: "Permission denied" },
          { status: 403 }
        )
      }

      // Recalculate and update influencer rank
      const updatedRank = await rankingSystem.calculateInfluencerRank(influencerId)

      return NextResponse.json({
        success: true,
        rank: updatedRank,
        message: "Rank updated successfully"
      })
    }

    return NextResponse.json(
      { message: "Invalid action" },
      { status: 400 }
    )
  } catch (error) {
    console.error("Error in ranking POST:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

async function canRefreshRank(userId: string, influencerId: string, userRole: string): Promise<boolean> {
  try {
    // Admin can refresh any rank
    if (userRole === "ADMIN") {
      return true
    }

    // Users can refresh their own rank
    const influencer = await prisma?.influencerProfile.findUnique({
      where: { id: influencerId }
    })

    return influencer?.userId === userId
  } catch (error) {
    console.error("Error checking refresh permission:", error)
    return false
  }
}