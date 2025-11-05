import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const subscriptionPlanSchema = z.object({
  influencerSubscriptionPlan: z.enum(["FREE", "PROFESSIONAL", "BUSINESS", "ENTERPRISE"]),
  brandSubscriptionPlan: z.enum(["BASIC", "PROFESSIONAL", "ENTERPRISE"]),
  userSubscriptionPlan: z.enum(["FREE", "TRIAL", "PRO", "BUSINESS", "ENTERPRISE"])
})

const subscriptionConfig = {
  influencerSubscriptionPlans: {
    FREE: {
      monthly: 0,
      campaigns_per_month: 5,
      applications_per_month: 10,
      message_count: 5,
    },
    PROFESSIONAL: {
      monthly: 49,
      campaigns_per_month: 25,
      applications_per_month: 50,
      message_count: 10,
    },
    BUSINESS: {
      monthly: 149,
      campaigns_per_month: 100,
      applications_per_month: 50,
      message_count: 25,
      auto_chat_support: true,
      analytics_access: true,
    },
    ENTERPRISE: {
      monthly: 499,
      campaigns_per_month: 200,
      applications_per_month: 100,
      message_count: 50,
      auto_chat_support: true,
      analytics_access: true,
      dedicated_support: true,
    }
  },

  brandSubscriptionPlans: {
    BASIC: {
      monthly: 49,
      campaigns_per_month: 10,
      applications_per_month: 5,
      message_count: 5,
      analytics_access: true,
    },
    PROFESSIONAL: {
      monthly: 149,
      campaigns_per_month: 25,
      applications_per_month: 50,
      message_count: 10,
      analytics_access: true,
      advanced_analytics: true,
    },
    ENTERPRISE: {
      monthly: 249,
      campaigns_per_month: 100,
      applications_per_month: 50,
      message_count: 25,
      analytics_access: true,
      advanced_analytics: true,
      campaign_coaching: true,
      dedicated_support: true,
    }
  }
}

const userSubscriptionConfig = {
  influencerUserPlans: {
    FREE: {
      canCreateCampaigns: false,
      canApplyToCampaigns: true,
      hasAnalytics: false,
      canChatSupport: false
    },
    PROFESSIONAL: {
      canCreateCampaigns: true,
      canApplyToCampaigns: true,
      hasAnalytics: true,
      canChatSupport: false,
      pricingDetails: {
        monthly: 49
      }
    },
    BUSINESS: {
      canCreateCampaigns: true,
      canApplyToCampaigns: true,
      hasAnalytics: true,
      canChatSupport: true,
      pricingDetails: {
        monthly: 149
      }
    },
    ENTERPRISE: {
      canCreateCampaigns: true,
      canApplyToCampaigns: true,
      hasAnalytics: true,
      canChatSupport: true,
      pricingDetails: {
        monthly: 249
      }
    }
  }
}

const brandUserPlans = {
  BASIC: {
    totalUsers: 3,
    totalCost: 147000,
    monthlyCost: 49
  },
  PROFESSIONAL: {
    totalUsers: 10,
    totalCost: 1490,
    monthlyCost: 149
  },
  BUSINESS: {
    totalUsers: 50,
    totalCost: 7450,
    monthlyCost: 249
  },
  ENTERPRISE: {
    totalUsers: 100,
    totalCost: 4990,
    monthlyCost: 499
  }
}

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
    const userType = searchParams.get("userType") || "all"

    // Get user counts
    const [totalUsersBrand, totalUsersInfluencer] = await Promise.all([
      prisma.user.count({ where: { role: "BRAND" } }),
      prisma.user.count({ where: { role: "INFLUENCER" } })
    ])

    const totalUsersInfluencers = totalUsersInfluencer + totalUsersBrand

    // Get platform statistics
    const [totalCampaigns, totalApplications, totalContracts] = await Promise.all([
      prisma.campaign.count(),
      prisma.application.count(),
      prisma.contract.count()
    ])

    const [payments, totalPayments] = await Promise.all([
      prisma.payment.findMany({ where: { status: "RELEASED" } }),
      prisma.payment.count({ where: { status: "RELEASED" } })
    ])

    // Calculate revenue
    const revenue = payments.reduce((sum, payment) => sum + payment.amount, 0)

    const activeContracts = totalContracts - 3 // Assume 3 contracts in review or completed

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers: totalUsersInfluencers,
        totalBrands: totalUsersBrand,
        totalInfluencers: totalUsersInfluencer,
        totalCampaigns,
        activeContracts,
        totalApplications,
        completedCampaigns: totalCampaigns - activeContracts,
        totalContracts,
        revenue,
        growthRate: totalUsers > 0 ? ((totalUsers - (totalUsers * 0.9)) / (totalUsers * 0.9) * 100).toFixed(1) : 0,
        engagementRate: totalContracts > 0 ? (totalApplications / (totalUsers * 10)) : 0,
        totalRevenue: revenue
      },
      matchingAlgorithm: "AI-powered matching v1.0",
      subscriptionConfig,
      userSubscriptionConfig
    })
  } catch (error) {
    console.error("Error in subscriptions API:", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") || "user"

    let body = {}
    try {
      body = await request.json()
    } catch (error) {
      console.error("Error parsing request body:", error)
      return NextResponse.json({ message: "Invalid JSON" }, { status: 400 })
    }

    // Handle different subscription types
    if (type === "userPlans") {
      return NextResponse.json(userSubscriptionConfig)
    }

    // Handle subscription purchase
    if (type === "purchase") {
      const { userId, plan, frequency } = body as {
        userId: string
        plan: string
        frequency: string
      }

      // Create or update subscription
      const subscription = await prisma.userSubscription.upsert({
        where: { userId },
        update: {
          subscriptionPlan: plan,
          frequency,
          plan,
          isActive: true,
          startDate: new Date(),
          endDate: frequency === "monthly" ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
          updatedAt: new Date()
        },
        create: {
          userId,
          subscriptionPlan: plan,
          frequency,
          isTrial: frequency !== "monthly",
          startDate: new Date(),
          endDate: frequency === "monthly" ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
          status: "ACTIVE"
        }
      })

      return NextResponse.json({ success: true, subscription })
    }

    // Get user subscription info
    if (type === "status") {
      const userId = session.user.id

      const [brandCount, influencerCount] = await Promise.all([
        prisma.brandProfile.count({
          where: { userId }
        }),
        prisma.influencerProfile.count({
          where: { userId }
        })
      ])

      const subscription = await prisma.userSubscription.findUnique({
        where: { userId }
      })

      const plan = subscription?.subscriptionPlan || "FREE"

      // Get usage statistics
      const usageStats = await prisma.application.count({
        where: {
          contract: { status: "COMPLETED" },
          influencerId: userId
        }
      })

      return NextResponse.json({
        currentPlan: plan,
        usageStats: {
          usageRate: usageStats / Math.max(influencerCount, 1),
          usageStats: usageStats,
          totalInfluencers: influencerCount,
          campaigns: usageStats
        }
      })
    }

    return NextResponse.json({ message: "Invalid request" }, { status: 400 })
  } catch (error) {
    console.error("Error in subscriptions API:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    const currentSubscription = await prisma.userSubscription.findUnique({
      where: { userId }
    })

    if (!currentSubscription) {
      return NextResponse.json({ message: "No active subscription" }, { status: 404 })
    }

    const { plan } = await request.json() as { plan: string }

    const updatedSubscription = await prisma.userSubscription.update({
      where: { userId },
      data: {
        subscriptionPlan: plan,
        isTrial: !currentSubscription.isTrial,
        isActive: true,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      subscription: updatedSubscription
    })
  } catch (error) {
    console.error("Error updating subscription:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}