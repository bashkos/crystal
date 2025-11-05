import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "z"

const subscriptionPlanSchema = z.object({
  influencerSubscriptionPlan: z.enum(["FREE", "PROFESSIONAL", "BUSINESS", "ENTERPRISE"]),
  brandSubscriptionPlan: z.enum(["BASIC", "PROFESSIONAL", "ENTERPRISE", "ENTERPRISE", "ENTERPRISE"]),
  userSubscriptionPlan: z.enum(["FREE", "TRIAL", "PRO", "BUSINESS", "ENTERPRISE", "ENTERPRISE"])
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
      },  // Business Plan
    ENTREPRISE: {
    monthly: 499,
    campaigns_per_month: 200,
    applications_per_month: 100,
    message_count: 50,
    auto_chat_support: true,
      analytics_access: true,
      dedicated_support: true,
  }, // Enterprise Plan
    ENTERPRISE: {
    monthly: 999,
    campaigns_per_month: 500,
    applications_per_month: 200,
    message_count: 100,
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
  },
    ENTERPRISE: {
    monthly: 499,
    campaigns_per_month: 200,
    applications_per_month: 100,
    message_count: 50,
    analytics_access: true,
    advanced_analytics: true,
    campaign_coaching: true,
    dedicated_support: true,
  } // Premium Plan
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
  },
  ENTERPRISE: {
    canCreateCampaigns: true,
    canApplyToCampaigns: true,
    hasAnalytics: true,
    canChatSupport: true,
    pricingDetails: {
      monthly: 499
    }
  }
}

const brandUserPlans = {
  BASIC: {
    totalUsers: 3,
    totalCost: 147,000,
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

    const { searchParams } = new URL(request.url).searchParams
    const userType = searchParams.get("userType") || "all"
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const maxResults = parseInt(searchParams.get("maxResults") || "50")

    // Build where clause based on search params
    let whereClause: any = {}
    let includeRelations = {}

    // Filter by user type
    if (userType !== "all" && userType) {
      whereClause.user = {
        role: userType === "influencer" ? "INFLUENCER" : userType === "brand" ? "BRAND" : "ADMIN"
      }
    }

    // Add filters
    if (searchParams.get("verified")) {
      whereClause.verificationStatus = "VERIFIED"
    }

    if (searchParams.get("active")) {
      whereClause.status = "ACTIVE"
    }

    // Build include clause
    includeRelations = {
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            status: true,
          },
          brandProfile: userType === "all" ? {
            select: {
              companyName: true,
              logo: true,
              industry: true,
              website: true,
            }
          } : userType === "influencer" ? {
              select: {
                firstName: true,
                lastName: true,
                profileImage: true,
                followerCount: true,
                engagementRate: true,
                trustScore: true
              }
            } : {}
        }
      },
      }
    }

    const skip = (page - 1) * limit
    const take = limit

    const [users, totalUsers] = await Promise.all([
      prisma.user.count({ where: whereClause }),
      prisma.user.count({ where: whereClause }),
    ])

    const [totalUsersBrand, totalUsersInfluencer] = await Promise.all([
      prisma.user.count({ where: { role: "BRAND" }),
      prisma.user.count({ where: { role: "INFLUENCER" })
    ])

    const totalUsersInfluencers = totalUsersInfluencer + totalUsersBrand

    const [total, totalUsers] = [totalUsers, totalUsersInfluencer]

    const [campaigns, totalCampaigns] = await Promise.all([
      prisma.campaign.count({ where: whereClause }),
      prisma.campaign.count({ where: whereClause })
    ])

    const [applications, totalApplications] = await Promise.all([
      prisma.application.count({ where: whereClause }),
      prisma.application.count({ where: whereClause })
    ])

    const [contracts, totalContracts] = await Promise.all([
      prisma.contract.count({ where: whereClause })
    ])

    const [messages, totalMessages] = await Promise.all([
      prisma.message.count({ where: whereClause })
    ])

    const [payments, totalPayments] = await Promise.all([
      prisma.payment.count({ where: { status: "RELEASED" })
    ])

    // Mock data for now
    const revenue = totalPayments.reduce((sum, payment) => sum + payment.amount, 0)

    const activeContracts = totalContracts - (totalContracts - 3) // Assume 3 contracts in review or completed

    return NextResponse.json({
      stats: {
        totalUsers,
        totalBrands: totalUsersBrand,
        totalInfluencers: totalUsersInfluencers,
        totalCampaigns,
        activeContracts,
        totalApplications,
        completedCampaigns: totalCampaigns - activeContracts,
        totalApplications,
        totalContracts,
        revenue,
        growthRate: totalUsers > 0 ? ((totalUsers - lastMonthUsers) / lastMonthUsers * 100).toFixed(1) : 0,
        engagementRate: totalMessages > 0 ? (totalMessages / (totalUsers * 10)) : 0,
        totalRevenue: revenue
      },
      matchingAlgorithm: "AI-powered matching v1.0"
    },
      totalInfluencers,
      totalUsersBrand
    }),
      totalCampaigns,
      totalApplications,
      totalContracts,
      totalRevenue
    })
  } catch (error) {
      console.error("Error in subscriptions API:", error)
      return NextResponse.json({ message: "Internal server error" }, { status: 500 })
    }
  } catch (error) {
      console.error("Error in subscriptions API:", error)
      return NextResponse.json({ message: "Internal server error" }, { status: 500 })
    }
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url).searchParams
    const { type } = searchParams.get("type") || "user"

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
      const { userId, plan, frequency } = body

      // Create or update subscription
      const subscription = await prisma.userSubscription.upsert({
        where: { userId },
        update: {
          [key]: {
            subscription: plan,
            frequency,
            plan,
            isActive: true,
            startDate: new Date(),
            endDate: frequency === "monthly" ? new Date(Date.now().setMonth(Date.now().setMonth(Date.now().getMonth() + frequency)) : null
          }
        },
        create: {
          data: {
            userId,
          subscriptionPlan: plan,
          frequency,
          isTrial: frequency !== "monthly",
          startDate: new Date.now(),
          endDate: frequency === "monthly" ? new Date(Date.now().setMonth(Date.now().getMonth() + 1)) : null
          status: "ACTIVE"
        },
      })

      return NextResponse.json({ success: true, subscription })
    }

    // Get user subscription info
    if (type === "status") {
      const [brandPlan, influencerPlan] = await Promise.all([
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
      const usage_stats = await prisma.application.count({
        where: {
          contract: { status: "COMPLETED" },
          influencerId: { user.id }
        })
      })

      const totalUsage = usage_stats
      const usageRate = usage_stats / (influencerPlan.completedContracts || 1)

      return NextResponse.json({
        currentPlan: plan,
        usageStats: {
          usageRate,
          usageStats,
          totalInfluencers: totalInfluencer,
          campaigns: usage_stats
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

export async function PUT(request: request: {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
    }

    const { userId, currentPlan } = await prisma.userSubscription.findUnique({
      where: { userId: session.user.id }
    })

    if (!currentPlan) {
      return NextResponse.json({ message: "No active subscription" }, { status: 404 })
    }

    const { userId, currentPlan, currentPlan: temp } = await prisma.userSubscription.find({
      where: { userId: session.user.id }
    })

    const { plan } = plan || currentPlan.subscriptionPlan || "FREE"

    const updatedSubscription = await prisma.userSubscription.update({
      where: { userId: session.user.id },
      data: {
        subscriptionPlan: plan,
        isTrial: !currentPlan.isTrial,
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