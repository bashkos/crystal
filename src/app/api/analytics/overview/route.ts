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

    const { searchParams } = new URL(request.url)
    const period = searchParams.get("period") || "30d" // 7d, 30d, 90d, 1y
    const isBrand = session.user.role === "BRAND"

    // Calculate date range
    const now = new Date()
    let startDate: Date
    switch (period) {
      case "7d":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case "1y":
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
      default: // 30d
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    // Common date filter
    const dateFilter = {
      createdAt: {
        gte: startDate,
        lte: now
      }
    }

    let overviewData: any = {}

    if (isBrand) {
      // Get brand's campaigns and related data
      const brandProfile = await prisma.brandProfile.findUnique({
        where: { userId: session.user.id }
      })

      if (!brandProfile) {
        return NextResponse.json(
          { message: "Brand profile not found" },
          { status: 404 }
        )
      }

      // Campaign metrics
      const [totalCampaigns, activeCampaigns, completedCampaigns] = await Promise.all([
        prisma.campaign.count({
          where: {
            brandId: brandProfile.id,
            createdAt: dateFilter.createdAt
          }
        }),
        prisma.campaign.count({
          where: {
            brandId: brandProfile.id,
            status: "IN_PROGRESS"
          }
        }),
        prisma.campaign.count({
          where: {
            brandId: brandProfile.id,
            status: "COMPLETED",
            updatedAt: dateFilter.createdAt
          }
        })
      ])

      // Application metrics
      const [totalApplications, hiredApplications] = await Promise.all([
        prisma.application.count({
          where: {
            campaign: {
              brandId: brandProfile.id
            },
            submittedAt: dateFilter.createdAt
          }
        }),
        prisma.application.count({
          where: {
            campaign: {
              brandId: brandProfile.id
            },
            status: "HIRED"
          }
        })
      ])

      // Financial metrics
      const contracts = await prisma.contract.findMany({
        where: {
          brandId: session.user.id,
          status: "COMPLETED",
          completedAt: dateFilter.createdAt
        },
        select: {
          totalAmount: true,
          campaign: {
            select: {
              category: true
            }
          }
        }
      })

      const totalSpent = contracts.reduce((sum, contract) => sum + contract.totalAmount, 0)
      const avgContractValue = contracts.length > 0 ? totalSpent / contracts.length : 0

      // Category breakdown
      const categoryStats = contracts.reduce((acc: any, contract) => {
        const category = contract.campaign.category
        if (!acc[category]) {
          acc[category] = { count: 0, total: 0 }
        }
        acc[category].count++
        acc[category].total += contract.totalAmount
        return acc
      }, {})

      // Engagement metrics from completed campaigns
      const submissions = await prisma.submission.findMany({
        where: {
          contract: {
            brandId: session.user.id,
            status: "COMPLETED"
          },
          status: "APPROVED",
          updatedAt: dateFilter.createdAt
        }
      })

      const avgEngagement = Math.random() * 5 + 2 // Simulated engagement rate

      overviewData = {
        campaignMetrics: {
          total: totalCampaigns,
          active: activeCampaigns,
          completed: completedCampaigns,
          completionRate: totalCampaigns > 0 ? (completedCampaigns / totalCampaigns) * 100 : 0
        },
        applicationMetrics: {
          total: totalApplications,
          hired: hiredApplications,
          hireRate: totalApplications > 0 ? (hiredApplications / totalApplications) * 100 : 0
        },
        financialMetrics: {
          totalSpent,
          avgContractValue,
          totalContracts: contracts.length
        },
        engagementMetrics: {
          avgEngagementRate: avgEngagement,
          totalSubmissions: submissions.length,
          approvalRate: submissions.length > 0 ? 95 : 0 // Simulated
        },
        categoryBreakdown: categoryStats,
        trends: await generateTrends(brandProfile.id, startDate, now, "brand")
      }

    } else {
      // Influencer analytics
      const influencerProfile = await prisma.influencerProfile.findUnique({
        where: { userId: session.user.id }
      })

      if (!influencerProfile) {
        return NextResponse.json(
          { message: "Influencer profile not found" },
          { status: 404 }
        )
      }

      // Application metrics
      const [totalApplications, hiredApplications, activeContracts] = await Promise.all([
        prisma.application.count({
          where: {
            influencerId: influencerProfile.id,
            submittedAt: dateFilter.createdAt
          }
        }),
        prisma.application.count({
          where: {
            influencerId: influencerProfile.id,
            status: "HIRED"
          }
        }),
        prisma.contract.count({
          where: {
            influencerId: session.user.id,
            status: "ACTIVE"
          }
        })
      ])

      // Earnings metrics
      const contracts = await prisma.contract.findMany({
        where: {
          influencerId: session.user.id,
          status: "COMPLETED",
          completedAt: dateFilter.createdAt
        },
        select: {
          totalAmount: true,
          campaign: {
            select: {
              category: true
            }
          }
        }
      })

      const totalEarnings = contracts.reduce((sum, contract) => sum + contract.totalAmount, 0)
      const avgEarningsPerContract = contracts.length > 0 ? totalEarnings / contracts.length : 0

      // Content metrics
      const submissions = await prisma.submission.findMany({
        where: {
          contract: {
            influencerId: session.user.id
          },
          updatedAt: dateFilter.createdAt
        }
      })

      const avgApprovalRate = submissions.length > 0 ? 92 : 0 // Simulated

      overviewData = {
        applicationMetrics: {
          total: totalApplications,
          hired: hiredApplications,
          successRate: totalApplications > 0 ? (hiredApplications / totalApplications) * 100 : 0,
          activeContracts
        },
        earningsMetrics: {
          totalEarnings,
          avgEarningsPerContract,
          completedContracts: contracts.length,
          projectedMonthly: totalEarnings * (30 / ((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
        },
        contentMetrics: {
          totalSubmissions: submissions.length,
          avgApprovalRate,
          avgRevisionRate: 1.2 // Simulated
        },
        performanceMetrics: {
          trustScore: influencerProfile.trustScore || 0,
          avgRating: 4.2, // Simulated
          totalReviews: Math.floor(Math.random() * 20) + 5 // Simulated
        },
        categoryBreakdown: contracts.reduce((acc: any, contract) => {
          const category = contract.campaign.category
          if (!acc[category]) {
            acc[category] = { count: 0, earnings: 0 }
          }
          acc[category].count++
          acc[category].earnings += contract.totalAmount
          return acc
        }, {}),
        trends: await generateTrends(influencerProfile.id, startDate, now, "influencer")
      }
    }

    return NextResponse.json(overviewData)
  } catch (error) {
    console.error("Error fetching analytics overview:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

async function generateTrends(profileId: string, startDate: Date, endDate: Date, type: "brand" | "influencer") {
  // Generate mock trend data for the selected period
  const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const trendData = []

  for (let i = 0; i < Math.min(days, 30); i++) {
    const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)

    if (type === "brand") {
      trendData.push({
        date: date.toISOString(),
        campaigns: Math.floor(Math.random() * 3) + 1,
        applications: Math.floor(Math.random() * 10) + 2,
        spend: Math.floor(Math.random() * 5000) + 1000,
        engagement: Math.random() * 5 + 2
      })
    } else {
      trendData.push({
        date: date.toISOString(),
        applications: Math.floor(Math.random() * 5) + 1,
        earnings: Math.floor(Math.random() * 2000) + 500,
        submissions: Math.floor(Math.random() * 3) + 1,
        views: Math.floor(Math.random() * 10000) + 1000
      })
    }
  }

  return trendData
}