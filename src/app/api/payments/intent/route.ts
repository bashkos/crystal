import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createPaymentIntent } from "@/lib/stripe"
import { prisma } from "@/lib/db"
import { z } from "zod"

const paymentIntentSchema = z.object({
  amount: z.number().min(1),
  contractId: z.string().optional(),
  campaignId: z.string().optional(),
  type: z.enum(["CAMPAIGN_FUNDING", "INFLUENCER_PAYOUT", "PLATFORM_FEE"]).default("CAMPAIGN_FUNDING"),
  metadata: z.object({}).optional(),
})

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const validatedData = paymentIntentSchema.parse(body)

    // Verify user has permission to make this payment
    if (validatedData.type === "CAMPAIGN_FUNDING" && session.user.role !== "BRAND") {
      return NextResponse.json(
        { message: "Only brands can fund campaigns" },
        { status: 403 }
      )
    }

    // If contract ID is provided, verify user is part of the contract
    if (validatedData.contractId) {
      const contract = await prisma.contract.findUnique({
        where: { id: validatedData.contractId }
      })

      if (!contract) {
        return NextResponse.json(
          { message: "Contract not found" },
          { status: 404 }
        )
      }

      if (contract.brandId !== session.user.id && contract.influencerId !== session.user.id) {
        return NextResponse.json(
          { message: "Access denied" },
          { status: 403 }
        )
      }
    }

    // Create payment intent with metadata
    const metadata = {
      userId: session.user.id,
      userRole: session.user.role,
      type: validatedData.type,
      ...(validatedData.contractId && { contractId: validatedData.contractId }),
      ...(validatedData.campaignId && { campaignId: validatedData.campaignId }),
      ...validatedData.metadata,
    }

    const paymentIntent = await createPaymentIntent(
      validatedData.amount,
      'usd',
      metadata
    )

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.payment_intent_id,
    })
  } catch (error) {
    console.error("Error creating payment intent:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid input data", errors: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: "Failed to create payment intent" },
      { status: 500 }
    )
  }
}