import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"
import { ABTestingPlatform } from "@/lib/testing/ab-testing"

const createTestSchema = z.object({
  campaignId: z.string(),
  name: z.string().min(1, "Test name is required"),
  description: z.string(),
  targetAudience: z.object({
    size: z.number().positive(),
    demographics: z.record(z.any()),
    filters: z.record(z.any())
  }),
  variants: z.array(z.object({
    name: z.string().min(1),
    description: z.string(),
    type: z.enum(["CREATIVE", "COPY", "OFFER", "TARGETING"]),
    content: z.record(z.any()),
    configuration: z.record(z.any()),
    trafficSplit: z.number().min(0).max(100)
  })).min(2, "At least 2 variants are required"),
  primaryMetric: z.string(),
  secondaryMetrics: z.array(z.string()),
  significanceLevel: z.number().min(0.01).max(0.1).default(0.05),
  minimumSampleSize: z.number().positive().default(1000)
})

const conversionSchema = z.object({
  testId: z.string(),
  variantId: z.string(),
  conversionData: z.object({
    type: z.enum(["click", "conversion", "revenue"]),
    value: z.number().optional(),
    metadata: z.record(z.any()).optional()
  })
})

const testActionSchema = z.object({
  testId: z.string(),
  action: z.enum(["start", "pause", "complete", "delete"])
})

const abTestingPlatform = new ABTestingPlatform()

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
    const testId = searchParams.get("testId")
    const campaignId = searchParams.get("campaignId")

    if (testId) {
      // Get specific test
      const test = await abTestingPlatform.getTest(testId)

      // Verify user has access to this test
      const hasAccess = await this.verifyTestAccess(session.user.id, test, session.user.role)
      if (!hasAccess) {
        return NextResponse.json(
          { message: "Access denied" },
          { status: 403 }
        )
      }

      return NextResponse.json({
        success: true,
        test
      })
    } else {
      // Get all tests for user/campaign
      const tests = await abTestingPlatform.getTests(campaignId || undefined)

      // Filter tests based on user access
      const filteredTests = await this.filterTestsByAccess(tests, session.user.id, session.user.role)

      return NextResponse.json({
        success: true,
        tests: filteredTests
      })
    }
  } catch (error) {
    console.error("Error in A/B testing API:", error)
    return NextResponse.json(
      { message: "Failed to fetch A/B test data" },
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

    if (action === "create") {
      // Create new A/B test
      const testData = createTestSchema.parse(body)

      // Verify user can create test for this campaign
      const canCreate = await this.verifyCampaignAccess(session.user.id, testData.campaignId, session.user.role)
      if (!canCreate) {
        return NextResponse.json(
          { message: "Access denied. You don't have permission to create tests for this campaign." },
          { status: 403 }
        )
      }

      const test = await abTestingPlatform.createTest({
        ...testData,
        createdBy: session.user.id
      })

      return NextResponse.json({
        success: true,
        test,
        message: "A/B test created successfully"
      })
    } else if (action === "recordConversion") {
      // Record conversion event
      const conversionData = conversionSchema.parse(body)

      // Verify test exists and is running
      const test = await abTestingPlatform.getTest(conversionData.testId)
      if (test.status !== "RUNNING") {
        return NextResponse.json(
          { message: "Test is not currently running" },
          { status: 400 }
        )
      }

      await abTestingPlatform.recordConversion(
        conversionData.testId,
        conversionData.variantId,
        conversionData.conversionData
      )

      return NextResponse.json({
        success: true,
        message: "Conversion recorded successfully"
      })
    } else {
      return NextResponse.json(
        { message: "Invalid action" },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error("Error in A/B testing POST:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation error", errors: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { message: "Failed to process A/B test request" },
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
    const actionData = testActionSchema.parse(body)

    // Get test and verify access
    const test = await abTestingPlatform.getTest(actionData.testId)
    const hasAccess = await this.verifyTestAccess(session.user.id, test, session.user.role)
    if (!hasAccess) {
      return NextResponse.json(
        { message: "Access denied" },
        { status: 403 }
      )
    }

    let updatedTest
    let message

    switch (actionData.action) {
      case "start":
        updatedTest = await abTestingPlatform.startTest(actionData.testId)
        message = "A/B test started successfully"
        break

      case "pause":
        updatedTest = await abTestingPlatform.pauseTest(actionData.testId)
        message = "A/B test paused successfully"
        break

      case "complete":
        updatedTest = await abTestingPlatform.completeTest(actionData.testId)
        message = "A/B test completed successfully"
        break

      case "delete":
        // In a real implementation, this would delete the test
        message = "A/B test deleted successfully"
        return NextResponse.json({
          success: true,
          message
        })

      default:
        return NextResponse.json(
          { message: "Invalid action" },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      test: updatedTest,
      message
    })
  } catch (error) {
    console.error("Error in A/B testing PUT:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation error", errors: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { message: "Failed to update A/B test" },
      { status: 500 }
    )
  }
}

async function verifyTestAccess(userId: string, test: any, userRole: string): Promise<boolean> {
  try {
    // Admin can access any test
    if (userRole === "ADMIN") {
      return true
    }

    // Test creator can access their own tests
    if (test.createdBy === userId) {
      return true
    }

    // Brand users can access tests for their campaigns
    if (userRole === "BRAND") {
      const campaign = await prisma?.campaign.findUnique({
        where: { id: test.campaignId },
        include: { brand: true }
      })
      return campaign?.brand?.userId === userId
    }

    return false
  } catch (error) {
    console.error("Error verifying test access:", error)
    return false
  }
}

async function verifyCampaignAccess(userId: string, campaignId: string, userRole: string): Promise<boolean> {
  try {
    // Admin can access any campaign
    if (userRole === "ADMIN") {
      return true
    }

    // Brand users can access their own campaigns
    if (userRole === "BRAND") {
      const campaign = await prisma?.campaign.findUnique({
        where: { id: campaignId },
        include: { brand: true }
      })
      return campaign?.brand?.userId === userId
    }

    return false
  } catch (error) {
    console.error("Error verifying campaign access:", error)
    return false
  }
}

async function filterTestsByAccess(tests: any[], userId: string, userRole: string): Promise<any[]> {
  // Admin sees all tests
  if (userRole === "ADMIN") {
    return tests
  }

  // Filter based on user access
  const accessibleTests = []
  for (const test of tests) {
    if (await verifyTestAccess(userId, test, userRole)) {
      accessibleTests.push(test)
    }
  }

  return accessibleTests
}