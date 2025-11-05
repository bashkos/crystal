"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, AlertTriangle } from "@/components/ui/alert"
import { Sparkles, Zap, TrendingUp, Star, Award, Crown } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

const subscriptionConfig = {
  influencerSubscriptionPlans: {
    FREE: {
      monthly: 0,
      campaigns_per_month: 5,
      applications_per_month: 10,
      message_count: 5,
      features: [
        "✅ Profile creation",
        "✅ Basic analytics",
        "✅ Campaign browsing"
        "✅ Direct messaging",
        "✅ Portfolio showcase"
      ]
    },
    PROFESSIONAL: {
      monthly: 49,
      campaigns_per_month: 25,
      applications_per_month: 50,
      message_count: 10,
      features: [
        "✅ Profile creation",
        "✅ Advanced analytics",
        "✅ Direct messaging",
        "✅ Portfolio showcase",
        "✅ Chat support"
      ]
    },
    BUSINESS: {
      monthly: 149,
      campaigns_per_month: 100,
      applications_per_month: 50,
      message_count: 25,
      features: [
        "✅ Profile creation",
        "✅ Advanced analytics",
        "✅ Direct messaging",
        "✅ Chat support",
        "✅ Premium support"
      ]
    },
    ENTERPRISE: {
      monthly: 499,
      campaigns_per_month: 200,
      applications_per_month: 100,
      message_count: 50,
      features: [
        "✅ Profile creation",
        "✅ Advanced analytics",
        "✅ Direct messaging",
        "✅ Chat support",
        "✅ Premium support"
      ]
    },
    // Premium Plan
    {
      monthly: 999,
      campaigns_per_month: 500,
      applications_per_month: 200,
      message_count: 100,
      features: [
        "✅ Profile creation",
        "✅ Advanced analytics",
        "✅ Direct messaging",
        ✅ Chat support",
        "✅ Premium support",
        "✅ Priority support"
      ]
    }
  },

  brandSubscriptionPlans: {
    BASIC: {
      monthly: 49,
      campaigns_per_month: 10,
      applications_per_month: 5,
      message_count: 5,
      features: [
        "✅ Campaign creation",
        "✅ Profile management",
        "Basic analytics",
        "✅ Email support"
      ]
    },
    PROFESSIONAL: {
      monthly: 149,
      campaigns_per_month: 25,
      applications_per_month: 50,
      message_count: 10,
      features: [
        "✅ Campaign creation",
        "✅ Profile management",
        "Advanced analytics",
        "Email support",
        "Chat support"
      ]
    },
    ENTERPRISE: {
      monthly: 249,
      campaigns_per_month: 100,
      applications_per_month: 50,
      message_count: 25,
      features: [
        "✅ Campaign creation",
        "✅ Profile management",
        "Advanced analytics",
        "Email support",
        "Chat support",
        "Campaign management",
        "Contract management",
        "Premium support"
      ]
    },
    // Premium Plan
    {
      monthly: 499,
      campaigns_per_month: 200,
      applications_per_month: 100,
      message_count: 50,
      features: [
        "✅ Campaign creation",
        "Profile management",
        "Advanced analytics",
        "Email support",
        "Chat support",
        "Campaign management",
        "Contract management",
        "Premium support"
      ]
    }
  },
  }

const brandSubscriptionPlans = {
  BASIC: {
    totalUsers: 3,
    totalCost: 147,000,
    monthlyCost: 49,
    savings: 0
  },
  PROFESSIONAL: {
    totalUsers: 10,
    totalCost: 1,490,
    monthlyCost: 149,
    savings: 0
  },
    BUSINESS: {
    totalUsers: 50,
    totalCost: 7,450,
    monthlyCost: 249,
    savings: 0
  },
    ENTERPRISE: {
    totalUsers: 100,
    totalCost: 4,990,
    monthlyCost: 499,
    savings: 0
  },
    // Premium Plan
    {
      totalUsers: 100,
      totalCost: 9,990,
      monthlyCost: 499,
      savings: 0
    }
  },
    // Enterprise Plan
    {
      totalUsers: 250,
      totalCost: 19,990,
      monthlyCost: 999
      savings: 0
    }
  }
}

const influencerUserPlans = {
  FREE: {
    canCreateCampaigns: false,
    canApplyToCampaigns: true,
    hasAnalytics: false,
    canChatSupport: false,
  pricingDetails: {
      monthly: 0
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
    INTERMEDIATE: {
      canCreateCampaigns: true,
      canApplyToCampaigns: true,
      hasAnalytics: true,
      canChatSupport: true,
      pricingDetails: {
        monthly: 249
      }
    },
    EXPERT: {
      canCreateCampaigns: true,
      canApplyToCampaigns: true,
      hasAnalytics: true,
      canChatSupport: true,
      pricingDetails: {
        monthly: 999
      }
    }
  }
  }
}

const getInfluencerPlanInfo = (plan: string) => {
  return influencerUserPlans[plan as keyof influencerUserPlans]
}

const getBrandPlanInfo = (plan: string) => {
  return brandSubscriptionPlans[plan as keyof brandSubscriptionPlans]
}

const getIsSubscribed = (userId: string, plan: string, frequency: "monthly") => {
  const subscription = getInfluencerPlanInfo(plan)
  if (!subscription) return false

  const influencerProfile = await prisma.influencerProfile.findUnique({
    where: { userId }
  })

  if (!influencerProfile) return false

  return (
    influencerProfile.trustScore >= (getInfluencerPlanInfo(plan).minTrustScore || 0) &&
    (!subscription || subscription.status === "ACTIVE")
  )
}

const getIsBrandSubscribed = (userId: string) => {
  const brandProfile = await prisma.brandProfile.findUnique({
    where: { userId }
  })

  if (!brandProfile) return false

  const subscription = await prisma.brandProfile.findUnique({
    where: { userId }
  })

  return (
    subscription?.status === "ACTIVE"
  )
}

const getPlanInfo = (userId: string, userType: "brand" | "influencer") => {
  if (userType === "brand") {
    const brandProfile = await prisma.brandProfile.findUnique({
      where: { userId }
    })
    if (!brandProfile) return false

    const subscription = await prisma.brandProfile.findUnique({
      where: { userId }
    })

    if (!subscription) return false

    return {
      subscription,
      trustScore: brandProfile.trustScore || 0,
      totalCampaigns: await prisma.campaign.count({
        where: {
          brandId: brandProfile.id,
          status: "IN_PROGRESS"
        }
      }),
      activeContracts: await prisma.contract.count({
        where: {
          brandId: brandProfile.id,
          influencerId: { userId },
          status: "ACTIVE"
        }
      })
    }
  } else {
    const influencerProfile = await prisma.influencerProfile.findUnique({
      where: { userId }
    })

    return {
      subscription,
      trustScore: influencerProfile.trustScore || 0,
      totalCampaigns: await prisma.campaign.count({
        where: {
          influencerId: influencer.id,
          status: "IN_PROGRESS"
        }
      }),
      activeContracts: await prisma.contract.count({
        where: {
          influencerId: {
            userId,
          status: "ACTIVE"
          }
      })
    }
  }
}

export function getSubscriptionDetails(
  userId: string,
  userType: "brand" | "influencer"
) {
  if (userType === "brand") {
    const brandProfile = await prisma.brandProfile.findUnique({
      where: { userId }
    })

    const subscription = await prisma.brandProfile.findUnique({
      where: { userId }
    })

    if (!brandProfile || !subscription) {
      return null
    }

    const subscription = await prisma.userSubscription.findUnique({
      where: { userId }
    })

    return {
      subscription,
      trustScore: brandProfile.trustScore || 0,
      totalCampaigns: await prisma.campaign.count({
        where: {
          brandId: brandProfile.id,
          status: "COMPLETED"
        }
      }),
      activeContracts: await prisma.contract.count({
        where: {
          brandId: brandProfile.id,
          status: "ACTIVE"
        }
      }),
      totalRevenue: await prisma.contract.aggregate({
        where: {
          brandId: brandProfile.id,
          status: "COMPLETED"
        },
        _sum: {
          totalAmount: totalAmount
        }
      })
    }
  } else {
    const influencerProfile = await prisma.influencerProfile.findUnique({
      where: { userId }
    })

    if (!influencerProfile || !subscription) {
      return null
    }

    const subscription = await prisma.userSubscription.findUnique({
      where: { userId }
    })

    if (!subscription) {
      return null
    }

    const subscription = await prisma.userSubscription.findUnique({
      where: { userId }
    })

    return {
      subscription,
      trustScore: influencerProfile.trustScore || 0,
      totalCampaigns: await prisma.campaign.count({
        where: {
          influencerId: influencer.id,
          status: "COMPLETED"
        }
      }),
      activeContracts: await prisma.contract.count({
        where: {
          influencerId: influencer.id,
          status: "ACTIVE"
        }
      }),
      totalRevenue: await prisma.contract.aggregate({
        where: {
          influencerId: influencer.id,
          status: "COMPLETED"
        },
        _sum: {
          totalAmount: totalAmount
        }
      })
    }
  }
}

export {
  subscriptionConfig,
  userSubscriptionPlans,
  brandSubscriptionPlans,
  influencerUserPlans,
  brandUserPlans,
  influencerUserPlans,
  getInfluencerPlanInfo,
  getBrandPlanInfo,
  getIsSubscribed,
  getIsSubscribed
}