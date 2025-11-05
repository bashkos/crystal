import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const contractId = params.id

    // Get contract with related data
    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
            category: true,
            brand: {
              select: {
                id: true,
                companyName: true,
                logo: true,
                userId: true
              }
            }
          }
        },
        brand: {
          select: {
            id: true,
            email: true,
            brandProfile: {
              select: {
                companyName: true,
                logo: true
              }
            }
          }
        },
        influencer: {
          select: {
            id: true,
            email: true,
            influencerProfile: {
              select: {
                firstName: true,
                lastName: true,
                profileImage: true
              }
            }
          }
        },
        submissions: {
          select: {
            id: true,
            title: true,
            status: true,
            submittedAt: true
          }
        },
        reviews: {
          select: {
            id: true,
            reviewerId: true,
            createdAt: true
          }
        },
        payments: {
          select: {
            id: true,
            amount: true,
            status: true,
            paymentType: true,
            createdAt: true
          }
        }
      }
    })

    if (!contract) {
      return NextResponse.json(
        { message: "Contract not found" },
        { status: 404 }
      )
    }

    // Check if user has access to this contract
    const userHasAccess = contract.brandId === session.user.id ||
                         contract.influencerId === session.user.id ||
                         session.user.role === "ADMIN"

    if (!userHasAccess) {
      return NextResponse.json(
        { message: "Access denied" },
        { status: 403 }
      )
    }

    // Add brandId and influencerId from user records for the review page
    const enhancedContract = {
      ...contract,
      brandId: contract.brand.id,
      influencerId: contract.influencer.id,
      brand: contract.brand.brandProfile,
      influencer: contract.influencer.influencerProfile
    }

    return NextResponse.json(enhancedContract)
  } catch (error) {
    console.error("Error fetching contract:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}