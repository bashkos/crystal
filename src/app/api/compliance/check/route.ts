import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"
import { ContentComplianceChecker } from "@/lib/ai/content-compliance"
import { triggerNotification } from "@/lib/api/notifications/stream"

const complianceCheckSchema = z.object({
  contentId: z.string(),
  influencerId: z.string(),
  campaignId: z.string(),
  contentType: z.enum(["image", "video", "text", "story"]),
  contentData: z.object({
    textContent: z.string().optional(),
    fileUrl: z.string().optional(),
    metadata: z.object({
      resolution: z.number().optional(),
      duration: z.number().optional(),
      fileSize: z.number().optional(),
      containsLogos: z.boolean().optional(),
      colors: z.array(z.string()).optional()
    }).optional()
  }),
  autoApprove: z.boolean().default(false)
})

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
    const {
      contentId,
      influencerId,
      campaignId,
      contentType,
      contentData,
      autoApprove
    } = complianceCheckSchema.parse(body)

    // Verify user has permission to check this content
    const canCheck = await this.verifyCompliancePermission(
      session.user.id,
      influencerId,
      campaignId,
      session.user.role
    )

    if (!canCheck) {
      return NextResponse.json(
        { message: "Permission denied. You can only check content you have access to." },
        { status: 403 }
      )
    }

    // Run compliance check
    const complianceChecker = new ContentComplianceChecker()
    const complianceResult = await complianceChecker.checkContentCompliance(
      contentId,
      influencerId,
      campaignId,
      contentData,
      contentType
    )

    // Update content status
    await prisma.submission.update({
      where: { id: contentId },
      data: {
        complianceStatus: complianceResult.status,
        complianceScore: complianceResult.score,
        complianceCheckedAt: new Date(),
        lastUpdated: new Date()
      }
    })

    // Send notifications based on result
    if (complianceResult.status === "REJECTED") {
      await triggerNotification({
        userId: influencerId,
        type: "COMPLIANCE_REJECTED",
        title: "Content Rejected",
        message: `Your content was rejected for compliance violations. Please review the feedback and resubmit.`,
        data: {
          contentId,
          campaignId,
          violations: complianceResult.violations,
          score: complianceResult.score
        },
        priority: "HIGH"
      })
    } else if (complianceResult.status === "FLAGGED") {
      await triggerNotification({
        userId: influencerId,
        type: "COMPLIANCE_FLAGGED",
        title: "Content Flagged for Review",
        message: `Your content has been flagged for manual review. We'll notify you once it's reviewed.`,
        data: {
          contentId,
          campaignId,
          violations: complianceResult.violations,
          score: complianceResult.score
        },
        priority: "MEDIUM"
      })
    } else if (complianceResult.status === "APPROVED") {
      await triggerNotification({
        userId: influencerId,
        type: "COMPLIANCE_APPROVED",
        title: "Content Approved",
        message: "Your content has passed compliance check and is approved!",
        data: {
          contentId,
          campaignId,
          score: complianceResult.score
        },
        priority: "LOW"
      })
    }

    return NextResponse.json({
      success: true,
      complianceCheck: complianceResult,
      recommendations: complianceResult.recommendations,
      nextSteps: this.getNextSteps(complianceResult, autoApprove)
    })
  } catch (error) {
    console.error("Error in compliance check:", error)
    return NextResponse.json(
      { message: "Compliance check failed" },
      { status: 500 }
    )
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
    const influencerId = searchParams.get("influencerId")
    const campaignId = searchParams.get("campaignId")
    const status = searchParams.get("status") as any

    // Get compliance history
    const complianceChecker = new ContentComplianceChecker()
    const history = await complianceChecker.getComplianceHistory(
      influencerId || undefined,
      campaignId || undefined,
      status || undefined
    )

    return NextResponse.json({
      success: true,
      complianceHistory: history,
      summary: this.generateComplianceSummary(history)
    })
  } catch (error) {
    console.error("Error fetching compliance history:", error)
    return NextResponse.json(
      { message: "Failed to fetch compliance history" },
      { status: 500 }
    )
  }
}

async function verifyCompliancePermission(
  userId: string,
  influencerId: string,
  campaignId: string,
  userRole: string
): Promise<boolean> {
  try {
    // Admin can check any content
    if (userRole === "ADMIN") {
      return true
    }

    // User can check their own content
    if (userId === influencerId) {
      return true
    }

    // Brand users can check content for their campaigns
    if (userRole === "BRAND") {
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: { brand: true }
      })

      return campaign?.brand?.userId === userId
    }

    return false
  } catch (error) {
    console.error("Error verifying compliance permission:", error)
    return false
  }
}

function getNextSteps(complianceResult: any, autoApprove: boolean): string[] {
  const steps: string[] = []

  if (complianceResult.status === "REJECTED") {
    steps.push("Review all compliance violations")
    steps.push("Make required modifications to your content")
    steps.push("Resubmit for compliance review")
  } else if (complianceResult.status === "FLAGGED") {
    steps.push("Content is under manual review")
    steps.push("You'll be notified once review is complete")
    if (complianceResult.violations.length > 0) {
      steps.push("Consider addressing flagged issues proactively")
    }
  } else if (complianceResult.status === "APPROVED") {
    steps.push("Content is approved and ready to post")
    steps.push("Follow posting guidelines and disclosure requirements")
    if (complianceResult.score < 90) {
      steps.push("Consider recommendations to improve future content")
    }
  }

  return steps
}

function generateComplianceSummary(history: any[]): {
  totalChecks: number
  approvalRate: number
  averageScore: number
  commonIssues: Array<{
    issue: string
    count: number
    percentage: number
  }>
} {
  if (history.length === 0) {
    return {
      totalChecks: 0,
      approvalRate: 0,
      averageScore: 0,
      commonIssues: []
    }
  }

  const approved = history.filter(h => h.status === "APPROVED").length
  const averageScore = history.reduce((sum, h) => sum + h.score, 0) / history.length

  // Find common issues
  const issueCounts = new Map<string, number>()
  history.forEach(h => {
    h.violations?.forEach((v: any) => {
      issueCounts.set(v.description, (issueCounts.get(v.description) || 0) + 1)
    })
  })

  const commonIssues = Array.from(issueCounts.entries())
    .map(([issue, count]) => ({
      issue,
      count,
      percentage: (count / history.length) * 100
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return {
    totalChecks: history.length,
    approvalRate: (approved / history.length) * 100,
    averageScore: Math.round(averageScore),
    commonIssues
  }
}