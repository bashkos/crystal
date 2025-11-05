import { prisma } from "../db"

export interface SocialPlatform {
  id: string
  name: 'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'linkedin' | 'facebook'
  displayName: string
  apiVersion: string
  rateLimits: {
    posts: number // per hour
    likes: number // per hour
    comments: number // per hour
    follows: number // per hour
  }
  authConfig: {
    type: 'oauth2' | 'api_key' | 'bearer_token'
    scopes: string[]
    refreshEnabled: boolean
  }
}

export interface SocialAccount {
  id: string
  userId: string
  platform: SocialPlatform['name']
  platformAccountId: string
  username: string
  displayName: string
  accessToken: string
  refreshToken?: string
  tokenExpiry?: string
  isActive: boolean
  isVerified: boolean
  metrics: {
    followers: number
    following: number
    posts: number
    engagementRate: number
    averageLikes: number
    averageComments: number
  }
  permissions: string[]
  connectedAt: string
  lastSync: string
}

export interface SocialPost {
  id: string
  accountId: string
  platformPostId: string
  campaignId?: string
  contentId?: string
  type: 'image' | 'video' | 'carousel' | 'story' | 'reel' | 'short'
  caption: string
  mediaUrls: string[]
  hashtags: string[]
  mentions: string[]
  location?: {
    name: string
    latitude: number
    longitude: number
  }
  scheduledAt?: string
  postedAt?: string
  status: 'draft' | 'scheduled' | 'posted' | 'failed' | 'deleted'
  metrics: {
    likes: number
    comments: number
    shares: number
    views: number
    saves: number
    reach: number
    impressions: number
    engagementRate: number
  }
  createdAt: string
  updatedAt: string
}

export interface PostAnalytics {
  postId: string
  platform: string
  timeRange: {
    start: string
    end: string
  }
  metrics: {
    reach: number
    impressions: number
    engagement: number
    engagementRate: number
    likes: number
    comments: number
    shares: number
    saves: number
    views: number
    clicks?: number
  }
  demographics: {
    ageRanges: Array<{ range: string; percentage: number }>
    genders: Array<{ gender: string; percentage: number }>
    locations: Array<{ country: string; percentage: number }>
    languages: Array<{ language: string; percentage: number }>
  }
  performance: {
    bestPerformingTime: string
    optimalPostingTimes: string[]
    contentTypePerformance: Record<string, number>
    hashtagEffectiveness: Array<{ hashtag: string; impact: number }>
  }
}

export class SocialMediaIntegrator {
  private readonly PLATFORMS: Record<string, SocialPlatform> = {
    instagram: {
      id: 'instagram',
      name: 'instagram',
      displayName: 'Instagram',
      apiVersion: 'v18.0',
      rateLimits: {
        posts: 25,
        likes: 60,
        comments: 60,
        follows: 20
      },
      authConfig: {
        type: 'oauth2',
        scopes: ['instagram_basic', 'instagram_content_publish', 'pages_show_list'],
        refreshEnabled: true
      }
    },
    tiktok: {
      id: 'tiktok',
      name: 'tiktok',
      displayName: 'TikTok',
      apiVersion: 'v1.0',
      rateLimits: {
        posts: 30,
        likes: 100,
        comments: 100,
        follows: 50
      },
      authConfig: {
        type: 'oauth2',
        scopes: ['user.info.basic', 'video.list'],
        refreshEnabled: true
      }
    },
    youtube: {
      id: 'youtube',
      name: 'youtube',
      displayName: 'YouTube',
      apiVersion: 'v3',
      rateLimits: {
        posts: 100,
        likes: 1000,
        comments: 500,
        follows: 50
      },
      authConfig: {
        type: 'oauth2',
        scopes: ['https://www.googleapis.com/auth/youtube.upload'],
        refreshEnabled: true
      }
    },
    twitter: {
      id: 'twitter',
      name: 'twitter',
      displayName: 'Twitter',
      apiVersion: 'v2',
      rateLimits: {
        posts: 300,
        likes: 1000,
        comments: 1000,
        follows: 400
      },
      authConfig: {
        type: 'bearer_token',
        scopes: [],
        refreshEnabled: false
      }
    }
  }

  async connectSocialAccount(
    userId: string,
    platform: SocialPlatform['name'],
    authData: {
      accessToken: string
      refreshToken?: string
      platformAccountId: string
      username: string
    }
  ): Promise<SocialAccount> {
    try {
      const platformConfig = this.PLATFORMS[platform]
      if (!platformConfig) {
        throw new Error(`Unsupported platform: ${platform}`)
      }

      // Verify credentials with platform API
      const accountInfo = await this.verifyPlatformCredentials(
        platform,
        authData.accessToken,
        authData.platformAccountId
      )

      // Check for existing account
      const existingAccount = await this.getExistingAccount(userId, platform, authData.platformAccountId)

      if (existingAccount) {
        // Update existing account
        await this.updateAccountTokens(existingAccount.id, authData)
        return existingAccount
      }

      // Create new social account record
      const socialAccount: SocialAccount = {
        id: `social-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        platform,
        platformAccountId: authData.platformAccountId,
        username: authData.username,
        displayName: accountInfo.displayName || authData.username,
        accessToken: authData.accessToken,
        refreshToken: authData.refreshToken,
        isActive: true,
        isVerified: accountInfo.isVerified || false,
        metrics: {
          followers: accountInfo.followers || 0,
          following: accountInfo.following || 0,
          posts: accountInfo.posts || 0,
          engagementRate: 0,
          averageLikes: 0,
          averageComments: 0
        },
        permissions: platformConfig.authConfig.scopes,
        connectedAt: new Date().toISOString(),
        lastSync: new Date().toISOString()
      }

      // Save to database
      await this.saveSocialAccount(socialAccount)

      // Initial sync of account metrics
      await this.syncAccountMetrics(socialAccount.id)

      return socialAccount
    } catch (error) {
      console.error(`Error connecting ${platform} account:`, error)
      throw error
    }
  }

  async createPost(
    accountId: string,
    postData: {
      type: SocialPost['type']
      caption: string
      mediaUrls: string[]
      hashtags?: string[]
      mentions?: string[]
      location?: any
      scheduledAt?: string
    },
    campaignId?: string,
    contentId?: string
  ): Promise<SocialPost> {
    try {
      const account = await this.getSocialAccount(accountId)
      if (!account || !account.isActive) {
        throw new Error('Social account not found or inactive')
      }

      // Validate content for platform
      await this.validateContentForPlatform(account.platform, postData)

      // Create post record
      const socialPost: SocialPost = {
        id: `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        accountId,
        platformPostId: '',
        campaignId,
        contentId,
        type: postData.type,
        caption: postData.caption,
        mediaUrls: postData.mediaUrls,
        hashtags: postData.hashtags || [],
        mentions: postData.mentions || [],
        location: postData.location,
        scheduledAt: postData.scheduledAt,
        status: postData.scheduledAt ? 'scheduled' : 'draft',
        metrics: {
          likes: 0,
          comments: 0,
          shares: 0,
          views: 0,
          saves: 0,
          reach: 0,
          impressions: 0,
          engagementRate: 0
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // Save post to database
      await this.saveSocialPost(socialPost)

      // Post immediately if not scheduled
      if (!postData.scheduledAt) {
        await this.publishPost(socialPost.id)
      } else {
        // Schedule post for later
        await this.schedulePost(socialPost.id, postData.scheduledAt)
      }

      return socialPost
    } catch (error) {
      console.error('Error creating social post:', error)
      throw error
    }
  }

  async publishPost(postId: string): Promise<SocialPost> {
    try {
      const post = await this.getSocialPost(postId)
      if (!post) {
        throw new Error('Post not found')
      }

      if (post.status !== 'draft' && post.status !== 'scheduled') {
        throw new Error('Post can only be published from draft or scheduled status')
      }

      const account = await this.getSocialAccount(post.accountId)
      if (!account) {
        throw new Error('Associated social account not found')
      }

      // Check rate limits
      await this.checkRateLimits(account.platform)

      // Publish to platform
      const platformResponse = await this.publishToPlatform(account, post)

      // Update post with platform response
      post.platformPostId = platformResponse.id
      post.postedAt = platformResponse.postedAt || new Date().toISOString()
      post.status = 'posted'
      post.updatedAt = new Date().toISOString()

      // Update metrics if available
      if (platformResponse.metrics) {
        post.metrics = { ...post.metrics, ...platformResponse.metrics }
      }

      // Save updated post
      await this.saveSocialPost(post)

      // Trigger analytics sync after delay
      setTimeout(() => {
        this.syncPostMetrics(postId)
      }, 5000) // 5 seconds delay

      return post
    } catch (error) {
      console.error('Error publishing post:', error)

      // Update post status to failed
      const post = await this.getSocialPost(postId)
      if (post) {
        post.status = 'failed'
        post.updatedAt = new Date().toISOString()
        await this.saveSocialPost(post)
      }

      throw error
    }
  }

  async getPostAnalytics(
    postId: string,
    timeRange: { start: string; end: string } = {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString()
    }
  ): Promise<PostAnalytics> {
    try {
      const post = await this.getSocialPost(postId)
      if (!post) {
        throw new Error('Post not found')
      }

      const account = await this.getSocialAccount(post.accountId)
      if (!account) {
        throw new Error('Associated social account not found')
      }

      // Fetch analytics from platform
      const platformAnalytics = await this.fetchPlatformAnalytics(
        account,
        post.platformPostId,
        timeRange
      )

      // Process and enrich analytics
      const analytics: PostAnalytics = {
        postId,
        platform: account.platform,
        timeRange,
        metrics: platformAnalytics.metrics,
        demographics: platformAnalytics.demographics || {
          ageRanges: [],
          genders: [],
          locations: [],
          languages: []
        },
        performance: await this.generatePerformanceInsights(post, platformAnalytics)
      }

      return analytics
    } catch (error) {
      console.error('Error fetching post analytics:', error)
      throw error
    }
  }

  async syncAccountMetrics(accountId: string): Promise<void> {
    try {
      const account = await this.getSocialAccount(accountId)
      if (!account) {
        throw new Error('Account not found')
      }

      // Fetch current metrics from platform
      const platformMetrics = await this.fetchAccountMetrics(account)

      // Update account metrics
      account.metrics = {
        ...account.metrics,
        ...platformMetrics
      }
      account.lastSync = new Date().toISOString()

      // Save updated account
      await this.saveSocialAccount(account)
    } catch (error) {
      console.error('Error syncing account metrics:', error)
      throw error
    }
  }

  async syncPostMetrics(postId: string): Promise<void> {
    try {
      const post = await this.getSocialPost(postId)
      if (!post || post.status !== 'posted') {
        return
      }

      const account = await this.getSocialAccount(post.accountId)
      if (!account) {
        throw new Error('Associated social account not found')
      }

      // Fetch latest metrics from platform
      const platformMetrics = await this.fetchPostMetrics(account, post.platformPostId)

      // Update post metrics
      post.metrics = { ...post.metrics, ...platformMetrics }

      // Calculate engagement rate
      if (post.metrics.impressions > 0) {
        post.metrics.engagementRate =
          ((post.metrics.likes + post.metrics.comments + post.metrics.shares) / post.metrics.impressions) * 100
      }

      post.updatedAt = new Date().toISOString()

      // Save updated post
      await this.saveSocialPost(post)
    } catch (error) {
      console.error('Error syncing post metrics:', error)
      // Don't throw error for sync failures
    }
  }

  // Platform-specific implementations
  private async verifyPlatformCredentials(
    platform: string,
    accessToken: string,
    accountId: string
  ): Promise<any> {
    // Mock implementation - in reality, make API calls to verify tokens
    switch (platform) {
      case 'instagram':
        return {
          displayName: 'Mock Instagram User',
          followers: 10000,
          following: 500,
          posts: 150,
          isVerified: false
        }
      case 'tiktok':
        return {
          displayName: 'Mock TikTok User',
          followers: 25000,
          following: 200,
          posts: 75,
          isVerified: false
        }
      default:
        return {
          displayName: 'Mock User',
          followers: 5000,
          following: 100,
          posts: 50,
          isVerified: false
        }
    }
  }

  private async publishToPlatform(account: SocialAccount, post: SocialPost): Promise<any> {
    // Mock implementation - in reality, make actual API calls
    console.log(`Publishing to ${account.platform}:`, post.caption)

    return {
      id: `platform-${Date.now()}`,
      postedAt: new Date().toISOString(),
      metrics: {
        likes: Math.floor(Math.random() * 1000),
        comments: Math.floor(Math.random() * 100),
        shares: Math.floor(Math.random() * 50),
        views: Math.floor(Math.random() * 10000)
      }
    }
  }

  private async fetchPlatformAnalytics(
    account: SocialAccount,
    platformPostId: string,
    timeRange: { start: string; end: string }
  ): Promise<any> {
    // Mock implementation - in reality, fetch from platform APIs
    return {
      metrics: {
        reach: Math.floor(Math.random() * 50000),
        impressions: Math.floor(Math.random() * 100000),
        engagement: Math.floor(Math.random() * 5000),
        likes: Math.floor(Math.random() * 1000),
        comments: Math.floor(Math.random() * 200),
        shares: Math.floor(Math.random() * 100),
        saves: Math.floor(Math.random() * 300),
        views: Math.floor(Math.random() * 20000)
      },
      demographics: {
        ageRanges: [
          { range: '18-24', percentage: 25 },
          { range: '25-34', percentage: 35 },
          { range: '35-44', percentage: 25 },
          { range: '45+', percentage: 15 }
        ],
        genders: [
          { gender: 'female', percentage: 65 },
          { gender: 'male', percentage: 35 }
        ],
        locations: [
          { country: 'United States', percentage: 45 },
          { country: 'United Kingdom', percentage: 15 },
          { country: 'Canada', percentage: 10 }
        ],
        languages: [
          { language: 'English', percentage: 85 },
          { language: 'Spanish', percentage: 10 }
        ]
      }
    }
  }

  private async validateContentForPlatform(
    platform: string,
    postData: any
  ): Promise<void> {
    // Platform-specific validation
    switch (platform) {
      case 'instagram':
        if (postData.caption.length > 2200) {
          throw new Error('Instagram caption too long (max 2200 characters)')
        }
        if (postData.hashtags && postData.hashtags.length > 30) {
          throw new Error('Instagram allows max 30 hashtags')
        }
        break
      case 'twitter':
        if (postData.caption.length > 280) {
          throw new Error('Tweet too long (max 280 characters)')
        }
        break
      case 'tiktok':
        if (postData.caption.length > 150) {
          throw new Error('TikTok caption too long (max 150 characters)')
        }
        break
    }
  }

  private async checkRateLimits(platform: string): Promise<void> {
    // Mock implementation - in reality, check against stored usage
    const platformConfig = this.PLATFORMS[platform]
    console.log(`Checking rate limits for ${platform}:`, platformConfig.rateLimits)
  }

  private async generatePerformanceInsights(
    post: SocialPost,
    analytics: any
  ): Promise<PostAnalytics['performance']> {
    return {
      bestPerformingTime: '19:00',
      optimalPostingTimes: ['09:00', '13:00', '19:00', '21:00'],
      contentTypePerformance: {
        [post.type]: analytics.metrics.engagementRate || 0
      },
      hashtagEffectiveness: post.hashtags.map((hashtag, index) => ({
        hashtag,
        impact: Math.random() * 20 + 5 // Mock impact calculation
      }))
    }
  }

  // Database interaction methods (mock implementations)
  private async getExistingAccount(userId: string, platform: string, platformAccountId: string): Promise<SocialAccount | null> {
    // Mock implementation - query database
    return null
  }

  private async updateAccountTokens(accountId: string, authData: any): Promise<void> {
    // Mock implementation - update database
  }

  private async saveSocialAccount(account: SocialAccount): Promise<void> {
    // Mock implementation - save to database
    console.log('Saving social account:', account.id)
  }

  private async saveSocialPost(post: SocialPost): Promise<void> {
    // Mock implementation - save to database
    console.log('Saving social post:', post.id)
  }

  private async getSocialAccount(accountId: string): Promise<SocialAccount | null> {
    // Mock implementation - query database
    return null
  }

  private async getSocialPost(postId: string): Promise<SocialPost | null> {
    // Mock implementation - query database
    return null
  }

  private async schedulePost(postId: string, scheduledAt: string): Promise<void> {
    // Mock implementation - set up scheduled job
    console.log(`Scheduling post ${postId} for ${scheduledAt}`)
  }

  private async fetchAccountMetrics(account: SocialAccount): Promise<Partial<SocialAccount['metrics']>> {
    // Mock implementation - fetch from platform API
    return {
      followers: Math.floor(Math.random() * 100000),
      following: Math.floor(Math.random() * 1000),
      posts: Math.floor(Math.random() * 500)
    }
  }

  private async fetchPostMetrics(account: SocialAccount, platformPostId: string): Promise<Partial<SocialPost['metrics']>> {
    // Mock implementation - fetch from platform API
    return {
      likes: Math.floor(Math.random() * 1000),
      comments: Math.floor(Math.random() * 100),
      shares: Math.floor(Math.random() * 50),
      views: Math.floor(Math.random() * 10000),
      impressions: Math.floor(Math.random() * 50000)
    }
  }
}