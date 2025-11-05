import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    // Get last month's date for growth calculation
    const now = new Date()
    const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const twoMonthsAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

    // Parallel queries for better performance
    const [
      totalUsers,
      totalBrands,
      totalInfluencers,
      totalCampaigns,
      activeCampaigns,
      completedCampaigns,
      totalApplications,
      pendingApplications,
      totalContracts,
      activeContracts,
      pendingVerifications,
      flaggedContentCount,
      supportTicketCount,
      totalRevenue,
      lastMonthUsers,
      lastMonthRevenue,
      avgTrustScoreData
    ] = await Promise.all([
      // Total counts
      prisma.user.count({
        where: {
          status: "ACTIVE"
        }
      }),
      prisma.brandProfile.count(),
      prisma.influencerProfile.count(),
      prisma.campaign.count(),
      prisma.campaign.count({
        where: { status: "IN_PROGRESS" }
      }),
      prisma.campaign.count({
        where: { status: "COMPLETED" }
      }),
      prisma.application.count(),
      prisma.application.count({
        where: { status: "SUBMITTED" }
      }),
      prisma.contract.count(),
      prisma.contract.count({
        where: { status: "ACTIVE" }
      }),
      prisma.user.count({
        where: { status: "PENDING" }
      }),
      // Mock flagged content count (would be from moderation system)
      Promise.resolve(Math.floor(Math.random() * 10)),
      // Mock support ticket count (would be from support system)
      Promise.resolve(Math.floor(Math.random() * 25)),
      // Total revenue from completed contracts
      prisma.contract.aggregate({
        where: {
          status: "COMPLETED",
          completedAt: {
            gte: new Date(now.getFullYear(), now.getMonth(), 1)
          }
        },
        _sum: {
          totalAmount: true
        }
      }),
      // Last month's users for growth calculation
      prisma.user.count({
        where: {
          createdAt: {
            gte: lastMonth,
            lt: now
          },
          status: "ACTIVE"
        }
      }),
      // Last month's revenue
      prisma.contract.aggregate({
        where: {
          status: "COMPLETED",
          completedAt: {
            gte: lastMonth,
            lt: now
          }
        },
        _sum: {
          totalAmount: true
        }
      }),
      // Average trust score
      Promise.all([
        prisma.brandProfile.aggregate({
          _avg: { trustScore: true }
        }),
        prisma.influencerProfile.aggregate({
          _avg: { trustScore: true }
        })
      ])
    ])

    // Calculate growth rates
    const lastMonthUsersForGrowth = await prisma.user.count({
      where: {
        createdAt: {
          gte: twoMonthsAgo,
          lt: lastMonth
        },
        status: "ACTIVE"
      }
    })

    const userGrowthRate = lastMonthUsersForGrowth > 0
      ? ((lastMonthUsers - lastMonthUsersForGrowth) / lastMonthUsersForGrowth) * 100
      : 0

    const revenueGrowthRate = (lastMonthRevenue._sum.totalAmount || 0) > 0
      ? (((totalRevenue._sum.totalAmount || 0) - (lastMonthRevenue._sum.totalAmount || 0)) /
          (lastMonthRevenue._sum.totalAmount || 1)) * 100
      : 0

    // Calculate average trust score across both types
    const brandAvg = avgTrustScoreData[0]._avg.trustScore || 0
    const influencerAvg = avgTrustScoreData[1]._avg.trustScore || 0
    const avgTrustScore = ((brandAvg + influencerAvg) / 2) * 20 // Convert to percentage

    const adminStats = {
      totalUsers,
      totalBrands,
      totalInfluencers,
      totalCampaigns,
      activeCampaigns,
      completedCampaigns,
      totalApplications,
      pendingApplications,
      totalContracts,
      activeContracts,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      pendingVerifications,
      flaggedContent: flaggedContentCount,
      supportTickets: supportTicketCount,
      avgTrustScore,
      growthRate: userGrowthRate,
      // Additional metrics for deeper insights
      metrics: {
        campaignCompletionRate: totalCampaigns > 0 ? (completedCampaigns / totalCampaigns) * 100 : 0,
        applicationSuccessRate: totalApplications > 0 ? ((totalApplications - pendingApplications) / totalApplications) * 100 : 0,
        averageContractValue: totalContracts > 0 ? (totalRevenue._sum.totalAmount || 0) / totalContracts : 0,
        userVerificationRate: (totalBrands + totalInfluencers) > 0 ? ((totalBrands + totalInfluencers - pendingVerifications) / (totalBrands + totalInfluencers)) * 100 : 0
      }
    }

    return NextResponse.json(adminStats)
  } catch (error) {
    console.error("Error fetching admin stats:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}