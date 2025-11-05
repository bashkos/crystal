import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"
import { SocialMediaIntegrator } from "@/lib/social/platform-integrations"

const connectAccountSchema = z.object({
  platform: z.enum(["instagram", "tiktok", "youtube", "twitter", "linkedin", "facebook"]),
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  platformAccountId: z.string(),
  username: z.string()
})

const createPostSchema = z.object({
  accountId: z.string(),
  type: z.enum(["image", "video", "carousel", "story", "reel", "short"]),
  caption: z.string(),
  mediaUrls: z.array(z.string()),
  hashtags: z.array(z.string()).optional(),
  mentions: z.array(z.string()).optional(),
  location: z.object({
    name: z.string(),
    latitude: z.number(),
    longitude: z.number()
  }).optional(),
  scheduledAt: z.string().optional(),
  campaignId: z.string().optional(),
  contentId: z.string().optional()
})

const postActionSchema = z.object({
  postId: z.string(),
  action: z.enum(["publish", "delete", "syncMetrics"])
})

const analyticsSchema = z.object({
  postId: z.string(),
  timeRange: z.object({
    start: z.string(),
    end: z.string()
  }).optional()
})

const socialMediaIntegrator = new SocialMediaIntegrator()

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
    const endpoint = searchParams.get("endpoint")
    const accountId = searchParams.get("accountId")
    const postId = searchParams.get("postId")

    if (endpoint === "accounts") {
      // Get user's connected social accounts
      const accounts = await socialMediaIntegrator.getUserAccounts(session.user.id)
      return NextResponse.json({
        success: true,
        accounts
      })
    }

    if (endpoint === "posts" && accountId) {
      // Get posts for specific account
      const posts = await socialMediaIntegrator.getAccountPosts(accountId)
      return NextResponse.json({
        success: true,
        posts
      })
    }

    if (endpoint === "analytics" && postId) {
      // Get post analytics
      const analyticsQuery = analyticsSchema.parse({
        postId,
        timeRange: {
          start: searchParams.get("start") || undefined,
          end: searchParams.get("end") || undefined
        }
      })

      const analytics = await socialMediaIntegrator.getPostAnalytics(
        analyticsQuery.postId,
        analyticsQuery.timeRange
      )

      return NextResponse.json({
        success: true,
        analytics
      })
    }

    if (endpoint === "platforms") {
      // Get available platforms
      const platforms = await socialMediaIntegrator.getAvailablePlatforms()
      return NextResponse.json({
        success: true,
        platforms
      })
    }

    if (endpoint === "metrics" && accountId) {
      // Get account metrics
      const metrics = await socialMediaIntegrator.getAccountMetrics(accountId)
      return NextResponse.json({
        success: true,
        metrics
      })
    }

    return NextResponse.json(
      { message: "Invalid endpoint" },
      { status: 400 }
    )
  } catch (error) {
    console.error("Error in social media API:", error)
    return NextResponse.json(
      { message: "Failed to fetch social media data" },
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
    const { action } = body

    if (action === "connect") {
      // Connect social media account
      const connectData = connectAccountSchema.parse(body)

      const account = await socialMediaIntegrator.connectSocialAccount(
        session.user.id,
        connectData.platform,
        {
          accessToken: connectData.accessToken,
          refreshToken: connectData.refreshToken,
          platformAccountId: connectData.platformAccountId,
          username: connectData.username
        }
      )

      return NextResponse.json({
        success: true,
        account,
        message: `${connectData.platform.charAt(0).toUpperCase() + connectData.platform.slice(1)} account connected successfully`
      })
    } else if (action === "createPost") {
      // Create social media post
      const postData = createPostSchema.parse(body)

      // Verify user has access to the account
      const hasAccess = await this.verifyAccountAccess(session.user.id, postData.accountId)
      if (!hasAccess) {
        return NextResponse.json(
          { message: "Access denied. You don't have access to this social account." },
          { status: 403 }
        )
      }

      const post = await socialMediaIntegrator.createPost(
        postData.accountId,
        {
          type: postData.type,
          caption: postData.caption,
          mediaUrls: postData.mediaUrls,
          hashtags: postData.hashtags,
          mentions: postData.mentions,
          location: postData.location,
          scheduledAt: postData.scheduledAt
        },
        postData.campaignId,
        postData.contentId
      )

      return NextResponse.json({
        success: true,
        post,
        message: "Post created successfully"
      })
    } else if (action === "bulkCreate") {
      // Create posts for multiple platforms
      const { posts } = body

      if (!Array.isArray(posts) || posts.length === 0) {
        return NextResponse.json(
          { message: "Invalid posts array" },
          { status: 400 }
        )
      }

      const results = []
      for (const postData of posts) {
        try {
          const validatedData = createPostSchema.parse(postData)
          const hasAccess = await this.verifyAccountAccess(session.user.id, validatedData.accountId)

          if (hasAccess) {
            const post = await socialMediaIntegrator.createPost(
              validatedData.accountId,
              {
                type: validatedData.type,
                caption: validatedData.caption,
                mediaUrls: validatedData.mediaUrls,
                hashtags: validatedData.hashtags,
                mentions: validatedData.mentions,
                location: validatedData.location,
                scheduledAt: validatedData.scheduledAt
              },
              validatedData.campaignId,
              validatedData.contentId
            )
            results.push({ success: true, post })
          } else {
            results.push({ success: false, error: "Access denied", accountId: validatedData.accountId })
          }
        } catch (error) {
          results.push({ success: false, error: (error as Error).message })
        }
      }

      return NextResponse.json({
        success: true,
        results,
        message: `Processed ${results.length} posts`
      })
    } else {
      return NextResponse.json(
        { message: "Invalid action" },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error("Error in social media POST:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation error", errors: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { message: "Failed to process social media request" },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user?.role === "UNVERIFIED") {
      return NextResponse.json(
        { message: "Access denied. Please login and verify your account" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const actionData = postActionSchema.parse(body)

    // Verify user has access to the post
    const hasAccess = await this.verifyPostAccess(session.user.id, actionData.postId)
    if (!hasAccess) {
      return NextResponse.json(
        { message: "Access denied. You don't have access to this post." },
        { status: 403 }
      )
    }

    let message
    let result

    switch (actionData.action) {
      case "publish":
        result = await socialMediaIntegrator.publishPost(actionData.postId)
        message = "Post published successfully"
        break

      case "delete":
        result = await socialMediaIntegrator.deletePost(actionData.postId)
        message = "Post deleted successfully"
        break

      case "syncMetrics":
        await socialMediaIntegrator.syncPostMetrics(actionData.postId)
        message = "Post metrics synchronized successfully"
        break

      default:
        return NextResponse.json(
          { message: "Invalid action" },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      result,
      message
    })
  } catch (error) {
    console.error("Error in social media PUT:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation error", errors: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { message: "Failed to update social media data" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user?.role === "UNVERIFIED") {
      return NextResponse.json(
        { message: "Access denied. Please login and verify your account" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const accountId = searchParams.get("accountId")

    if (!accountId) {
      return NextResponse.json(
        { message: "Account ID is required" },
        { status: 400 }
      )
    }

    // Verify user has access to the account
    const hasAccess = await this.verifyAccountAccess(session.user.id, accountId)
    if (!hasAccess) {
      return NextResponse.json(
        { message: "Access denied. You don't have access to this social account." },
        { status: 403 }
      )
    }

    // Disconnect social media account
    await socialMediaIntegrator.disconnectSocialAccount(accountId)

    return NextResponse.json({
      success: true,
      message: "Social account disconnected successfully"
    })
  } catch (error) {
    console.error("Error in social media DELETE:", error)
    return NextResponse.json(
      { message: "Failed to disconnect social account" },
      { status: 500 }
    )
  }
}

// Helper functions for access verification
async function verifyAccountAccess(userId: string, accountId: string): Promise<boolean> {
  try {
    // Mock implementation - in reality, query database
    const account = await socialMediaIntegrator.getSocialAccount(accountId)
    return account?.userId === userId
  } catch (error) {
    console.error("Error verifying account access:", error)
    return false
  }
}

async function verifyPostAccess(userId: string, postId: string): Promise<boolean> {
  try {
    // Mock implementation - in reality, query database
    const post = await socialMediaIntegrator.getSocialPost(postId)
    const account = post ? await socialMediaIntegrator.getSocialAccount(post.accountId) : null
    return account?.userId === userId
  } catch (error) {
    console.error("Error verifying post access:", error)
    return false
  }
}

// Extend the SocialMediaIntegrator class with additional methods
declare module "@/lib/social/platform-integrations" {
  interface SocialMediaIntegrator {
    getUserAccounts(userId: string): Promise<any[]>
    getAccountPosts(accountId: string): Promise<any[]>
    getAccountMetrics(accountId: string): Promise<any>
    getAvailablePlatforms(): Promise<any[]>
    deletePost(postId: string): Promise<any>
    disconnectSocialAccount(accountId: string): Promise<void>
  }
}

SocialMediaIntegrator.prototype.getUserAccounts = async function(userId: string): Promise<any[]> {
  // Mock implementation - query database for user's connected accounts
  return [
    {
      id: 'account-1',
      platform: 'instagram',
      username: 'mockuser',
      displayName: 'Mock User',
      followers: 10000,
      isActive: true,
      lastSync: new Date().toISOString()
    }
  ]
}

SocialMediaIntegrator.prototype.getAccountPosts = async function(accountId: string): Promise<any[]> {
  // Mock implementation - query database for account's posts
  return [
    {
      id: 'post-1',
      type: 'image',
      caption: 'Sample post',
      status: 'posted',
      postedAt: new Date().toISOString(),
      metrics: {
        likes: 150,
        comments: 25,
        shares: 10
      }
    }
  ]
}

SocialMediaIntegrator.prototype.getAccountMetrics = async function(accountId: string): Promise<any> {
  // Mock implementation - fetch current account metrics
  return {
    followers: 10000,
    following: 500,
    engagementRate: 3.5,
    averageLikes: 250,
    averageComments: 30
  }
}

SocialMediaIntegrator.prototype.getAvailablePlatforms = async function(): Promise<any[]> {
  // Return available platforms
  return [
    {
      id: 'instagram',
      name: 'Instagram',
      displayName: 'Instagram',
      supportedTypes: ['image', 'video', 'carousel', 'story', 'reel']
    },
    {
      id: 'tiktok',
      name: 'TikTok',
      displayName: 'TikTok',
      supportedTypes: ['video', 'short']
    },
    {
      id: 'twitter',
      name: 'Twitter',
      displayName: 'Twitter',
      supportedTypes: ['image', 'video', 'text']
    }
  ]
}

SocialMediaIntegrator.prototype.deletePost = async function(postId: string): Promise<any> {
  // Mock implementation - delete post from platform and database
  console.log('Deleting post:', postId)
  return { success: true }
}

SocialMediaIntegrator.prototype.disconnectSocialAccount = async function(accountId: string): Promise<void> {
  // Mock implementation - disconnect account and clean up data
  console.log('Disconnecting account:', accountId)
}