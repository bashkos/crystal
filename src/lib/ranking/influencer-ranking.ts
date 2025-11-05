import { prisma } from "../db"

export interface InfluencerRank {
  influencerId: string
  userId: string
  globalRank: number
  nicheRank: number
  categoryRank: number
  score: number
  level: string
  badges: Badge[]
  trend: 'up' | 'down' | 'stable'
  previousRank?: number
}

export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  color: string
  earnedAt: string
  category: 'performance' | 'engagement' | 'quality' | 'consistency' | 'growth'
}

export interface RankingMetrics {
  performanceScore: number
  engagementRate: number
  contentQuality: number
  consistency: number
  growthRate: number
  trustScore: number
  deliverableScore: number
  brandAlignment: number
  responseTime: number
  professionalism: number
}

export interface LeaderboardEntry {
  rank: number
  influencer: {
    id: string
    name: string
    username: string
    avatar?: string
    niche: string[]
    followers: number
    trustScore: number
  }
  score: number
  metrics: RankingMetrics
  badges: Badge[]
  trend: 'up' | 'down' | 'stable'
}

export class InfluencerRankingSystem {
  private readonly LEVELS = [
    { name: "Bronze", minScore: 0, maxScore: 39, color: "bronze" },
    { name: "Silver", minScore: 40, maxScore: 64, color: "silver" },
    { name: "Gold", minScore: 65, maxScore: 79, color: "gold" },
    { name: "Platinum", minScore: 80, maxScore: 89, color: "platinum" },
    { name: "Diamond", minScore: 90, maxScore: 100, color: "diamond" }
  ]

  private readonly BADGES = {
    performance: [
      {
        id: "perf-100",
        name: "Perfectionist",
        description: "Maintain 100% on-time delivery rate",
        icon: "🎯",
        color: "gold"
      },
      {
        id: "perf-5star",
        name: "5-Star Creator",
        description: "Receive 10+ 5-star reviews",
        icon: "⭐",
        color: "blue"
      }
    ],
    engagement: [
      {
        id: "eng-viral",
        name: "Viral Content",
        description: "Create content with 100k+ engagement",
        icon: "🔥",
        color: "red"
      },
      {
        id: "eng-consistent",
        name: "Engagement Master",
        description: "Maintain 5%+ engagement rate for 30 days",
        icon: "💫",
        color: "purple"
      }
    ],
    quality: [
      {
        id: "qual-perfect",
        name: "Quality Expert",
        description: "Average content quality score of 90+",
        icon: "💎",
        color: "green"
      },
      {
        id: "qual-creative",
        name: "Creative Genius",
        description: "Recognized for creative excellence",
        icon: "🎨",
        color: "orange"
      }
    ],
    consistency: [
      {
        id: "cons-daily",
        name: "Daily Creator",
        description: "Post content daily for 90 days",
        icon: "📅",
        color: "indigo"
      },
      {
        id: "cons-reliable",
        name: "Most Reliable",
        description: "100% deliverable completion rate",
        icon: "✅",
        color: "emerald"
      }
    ],
    growth: [
      {
        id: "growth-rocket",
        name: "Growth Rocket",
        description: "50% follower growth in 30 days",
        icon: "🚀",
        color: "cyan"
      },
      {
        id: "growth-viral",
        name: "Breakout Creator",
        description: "Reach 100k followers",
        icon: "🌟",
        color: "yellow"
      }
    ]
  }

  async calculateInfluencerRank(influencerId: string): Promise<InfluencerRank> {
    try {
      // Get influencer profile data
      const influencer = await prisma.influencerProfile.findUnique({
        where: { id: influencerId },
        include: {
          user: true,
          platforms: true,
          applications: {
            include: {
              contract: {
                include: {
                  campaign: true
                }
              }
            }
          }
        }
      })

      if (!influencer) {
        throw new Error('Influencer not found')
      }

      // Calculate ranking metrics
      const metrics = await this.calculateRankingMetrics(influencer)

      // Calculate overall score
      const score = this.calculateOverallScore(metrics)

      // Determine level
      const level = this.determineLevel(score)

      // Get earned badges
      const badges = await this.calculateBadges(influencer, metrics)

      // Get current and previous rank
      const { currentRank, previousRank, trend } = await this.calculateRankPosition(
        influencerId,
        score
      )

      const influencerRank: InfluencerRank = {
        influencerId,
        userId: influencer.userId,
        globalRank: currentRank.global,
        nicheRank: currentRank.niche,
        categoryRank: currentRank.category,
        score,
        level: level.name,
        badges,
        trend,
        previousRank: previousRank?.global
      }

      // Save ranking data
      await this.saveInfluencerRank(influencerRank)

      return influencerRank
    } catch (error) {
      console.error('Error calculating influencer rank:', error)
      throw error
    }
  }

  async calculateRankingMetrics(influencer: any): Promise<RankingMetrics> {
    // Get recent campaign performance
    const recentContracts = influencer.applications
      .filter((app: any) => app.contract)
      .map((app: any) => app.contract)
      .slice(-10) // Last 10 contracts

    // Performance metrics
    const completedContracts = recentContracts.filter((c: any) => c.status === 'COMPLETED')
    const onTimeDelivery = recentContracts.filter((c: any) =>
      new Date(c.deliveredAt) <= new Date(c.deadline)
    ).length
    const performanceScore = recentContracts.length > 0
      ? (completedContracts.length / recentContracts.length) * 100
      : 50

    // Engagement rate (from platform data)
    const avgEngagementRate = influencer.platforms.reduce((sum: number, platform: any) => {
      return sum + (platform.engagementRate || 0)
    }, 0) / Math.max(influencer.platforms.length, 1)

    // Content quality (from recent submissions)
    const contentQuality = await this.calculateContentQuality(influencer.id)

    // Consistency score
    const consistency = await this.calculateConsistency(influencer.id)

    // Growth rate
    const growthRate = await this.calculateGrowthRate(influencer.id)

    // Trust score (from profile or calculated)
    const trustScore = influencer.trustScore || 3

    // Deliverable score
    const deliverableScore = recentContracts.length > 0
      ? (onTimeDelivery / recentContracts.length) * 100
      : 50

    // Brand alignment (from brand feedback)
    const brandAlignment = await this.calculateBrandAlignment(influencer.id)

    // Response time (from application submission times)
    const responseTimeScore = await this.calculateResponseTimeScore(influencer.id)

    // Professionalism (from reviews and ratings)
    const professionalism = await this.calculateProfessionalism(influencer.id)

    return {
      performanceScore,
      engagementRate: avgEngagementRate,
      contentQuality,
      consistency,
      growthRate,
      trustScore: (trustScore / 5) * 100, // Convert 1-5 to percentage
      deliverableScore,
      brandAlignment,
      responseTime: responseTimeScore,
      professionalism
    }
  }

  private calculateOverallScore(metrics: RankingMetrics): number {
    const weights = {
      performanceScore: 0.20,
      engagementRate: 0.15,
      contentQuality: 0.15,
      consistency: 0.10,
      growthRate: 0.10,
      trustScore: 0.15,
      deliverableScore: 0.05,
      brandAlignment: 0.05,
      responseTime: 0.02,
      professionalism: 0.03
    }

    const weightedScore = Object.entries(weights).reduce((sum, [key, weight]) => {
      const value = metrics[key as keyof RankingMetrics]
      return sum + (value * weight)
    }, 0)

    return Math.round(Math.min(100, Math.max(0, weightedScore)))
  }

  private determineLevel(score: number) {
    return this.LEVELS.find(level => score >= level.minScore && score <= level.maxScore) ||
           this.LEVELS[0]
  }

  private async calculateBadges(influencer: any, metrics: RankingMetrics): Promise<Badge[]> {
    const earnedBadges: Badge[] = []

    // Performance badges
    if (metrics.deliverableScore === 100) {
      earnedBadges.push({
        ...this.BADGES.performance[0],
        category: 'performance',
        earnedAt: new Date().toISOString()
      })
    }

    // Engagement badges
    if (metrics.engagementRate >= 5) {
      earnedBadges.push({
        ...this.BADGES.engagement[1],
        category: 'engagement',
        earnedAt: new Date().toISOString()
      })
    }

    // Quality badges
    if (metrics.contentQuality >= 90) {
      earnedBadges.push({
        ...this.BADGES.quality[0],
        category: 'quality',
        earnedAt: new Date().toISOString()
      })
    }

    // Consistency badges
    if (metrics.consistency >= 95) {
      earnedBadges.push({
        ...this.BADGES.consistency[1],
        category: 'consistency',
        earnedAt: new Date().toISOString()
      })
    }

    // Growth badges
    if (metrics.growthRate >= 50) {
      earnedBadges.push({
        ...this.BADGES.growth[0],
        category: 'growth',
        earnedAt: new Date().toISOString()
      })
    }

    return earnedBadges
  }

  private async calculateRankPosition(
    influencerId: string,
    currentScore: number
  ): Promise<{
    currentRank: { global: number; niche: number; category: number }
    previousRank?: { global: number; niche: number; category: number }
    trend: 'up' | 'down' | 'stable'
  }> {
    // This is a simplified implementation
    // In reality, you'd query all influencer scores and calculate rankings

    const mockCurrentRank = {
      global: Math.floor(Math.random() * 1000) + 1,
      niche: Math.floor(Math.random() * 100) + 1,
      category: Math.floor(Math.random() * 50) + 1
    }

    const mockPreviousRank = {
      global: mockCurrentRank.global + Math.floor(Math.random() * 10) - 5,
      niche: mockCurrentRank.niche + Math.floor(Math.random() * 5) - 2,
      category: mockCurrentRank.category + Math.floor(Math.random() * 3) - 1
    }

    const trend = mockCurrentRank.global < mockPreviousRank.global ? 'up' :
                  mockCurrentRank.global > mockPreviousRank.global ? 'down' : 'stable'

    return {
      currentRank: mockCurrentRank,
      previousRank: mockPreviousRank,
      trend
    }
  }

  private async calculateContentQuality(influencerId: string): Promise<number> {
    // Mock implementation - in reality, this would analyze actual content
    return Math.random() * 30 + 70 // 70-100 range
  }

  private async calculateConsistency(influencerId: string): Promise<number> {
    // Mock implementation - check posting consistency
    return Math.random() * 20 + 80 // 80-100 range
  }

  private async calculateGrowthRate(influencerId: string): Promise<number> {
    // Mock implementation - calculate follower growth
    return Math.random() * 40 + 10 // 10-50% range
  }

  private async calculateBrandAlignment(influencerId: string): Promise<number> {
    // Mock implementation - based on brand feedback
    return Math.random() * 20 + 80 // 80-100 range
  }

  private async calculateResponseTimeScore(influencerId: string): Promise<number> {
    // Mock implementation - based on application response times
    return Math.random() * 30 + 70 // 70-100 range
  }

  private async calculateProfessionalism(influencerId: string): Promise<number> {
    // Mock implementation - based on reviews and ratings
    return Math.random() * 25 + 75 // 75-100 range
  }

  private async saveInfluencerRank(rank: InfluencerRank): Promise<void> {
    // Mock implementation - save to database
    console.log('Saving influencer rank:', rank)
  }

  // Public methods for leaderboards
  async getLeaderboard(type: 'global' | 'niche' | 'category', filters?: {
    niche?: string
    category?: string
    timeRange?: 'week' | 'month' | 'quarter' | 'year'
    limit?: number
  }): Promise<LeaderboardEntry[]> {
    try {
      // Mock implementation - in reality, query database with rankings
      const mockLeaderboard: LeaderboardEntry[] = Array.from({ length: 50 }, (_, i) => ({
        rank: i + 1,
        influencer: {
          id: `influencer-${i + 1}`,
          name: `Influencer ${i + 1}`,
          username: `@creator${i + 1}`,
          niche: ['fashion', 'tech', 'beauty', 'fitness', 'food'][i % 5],
          followers: Math.floor(Math.random() * 900000) + 100000,
          trustScore: Math.random() * 2 + 3
        },
        score: Math.floor(Math.random() * 40) + 60,
        metrics: {
          performanceScore: Math.random() * 30 + 70,
          engagementRate: Math.random() * 8 + 2,
          contentQuality: Math.random() * 20 + 80,
          consistency: Math.random() * 15 + 85,
          growthRate: Math.random() * 40 + 10,
          trustScore: Math.random() * 2 + 3,
          deliverableScore: Math.random() * 20 + 80,
          brandAlignment: Math.random() * 15 + 85,
          responseTime: Math.random() * 30 + 70,
          professionalism: Math.random() * 25 + 75
        },
        badges: [
          {
            id: "perf-100",
            name: "Perfectionist",
            description: "Maintain 100% on-time delivery rate",
            icon: "🎯",
            color: "gold",
            category: "performance",
            earnedAt: new Date().toISOString()
          }
        ],
        trend: i % 3 === 0 ? 'up' : i % 3 === 1 ? 'down' : 'stable'
      }))

      return mockLeaderboard.slice(0, filters?.limit || 50)
    } catch (error) {
      console.error('Error fetching leaderboard:', error)
      throw error
    }
  }

  async getInfluencerRankHistory(
    influencerId: string,
    timeRange: 'week' | 'month' | 'quarter' | 'year' = 'month'
  ): Promise<Array<{
    date: string
    rank: number
    score: number
    level: string
  }>> {
    // Mock implementation - return historical ranking data
    const days = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : timeRange === 'quarter' ? 90 : 365

    return Array.from({ length: Math.min(days, 30) }, (_, i) => ({
      date: new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      rank: Math.floor(Math.random() * 100) + 1,
      score: Math.floor(Math.random() * 30) + 70,
      level: this.LEVELS[Math.floor(Math.random() * this.LEVELS.length)].name
    }))
  }

  async getRankingStats(): Promise<{
    totalInfluencers: number
    averageScore: number
    topPerformers: number
    levelDistribution: Record<string, number>
    mostEarnedBadges: Array<Badge & { count: number }>
  }> {
    // Mock implementation
    return {
      totalInfluencers: 15420,
      averageScore: 73.5,
      topPerformers: 847,
      levelDistribution: {
        Bronze: 4626,
        Silver: 5408,
        Gold: 3084,
        Platinum: 1842,
        Diamond: 460
      },
      mostEarnedBadges: [
        { ...this.BADGES.consistency[0], count: 3420, category: "consistency", earnedAt: "" },
        { ...this.BADGES.performance[1], count: 2890, category: "performance", earnedAt: "" },
        { ...this.BADGES.engagement[1], count: 2156, category: "engagement", earnedAt: "" }
      ]
    }
  }
}