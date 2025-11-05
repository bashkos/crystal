import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"

const messageSchema = z.object({
  receiverId: z.string(),
  content: z.string().min(1),
  messageType: z.enum(["TEXT", "IMAGE", "VIDEO", "FILE"]).default("TEXT"),
  contractId: z.string().optional(),
  attachments: z.array(z.any()).optional(),
})

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const userId = searchParams.get("userId")

    // Build where clause
    let whereClause: any = {}

    if (userId) {
      // Get conversation with specific user
      whereClause = {
        OR: [
          { senderId: session.user.id, receiverId: userId },
          { senderId: userId, receiverId: session.user.id }
        ]
      }
    } else {
      // Get all messages for the user
      whereClause = {
        OR: [
          { senderId: session.user.id },
          { receiverId: session.user.id }
        ]
      }
    }

    const skip = (page - 1) * limit

    const messages = await prisma.message.findMany({
      where: whereClause,
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            role: true,
            brandProfile: {
              select: {
                companyName: true,
                logo: true
              }
            },
            influencerProfile: {
              select: {
                firstName: true,
                lastName: true,
                profileImage: true
              }
            }
          }
        },
        receiver: {
          select: {
            id: true,
            email: true,
            role: true,
            brandProfile: {
              select: {
                companyName: true,
                logo: true
              }
            },
            influencerProfile: {
              select: {
                firstName: true,
                lastName: true,
                profileImage: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit,
    })

    return NextResponse.json(messages)
  } catch (error) {
    console.error("Error fetching messages:", error)
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}

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
    const validatedData = messageSchema.parse(body)

    // Create message
    const message = await prisma.message.create({
      data: {
        senderId: session.user.id,
        receiverId: validatedData.receiverId,
        contractId: validatedData.contractId,
        content: validatedData.content,
        messageType: validatedData.messageType,
        attachments: validatedData.attachments || [],
        isRead: false,
        createdAt: new Date(),
      },
      include: {
        sender: {
          select: {
            id: true,
            email: true,
            role: true,
            brandProfile: {
              select: {
                companyName: true,
                logo: true
              }
            },
            influencerProfile: {
              select: {
                firstName: true,
                lastName: true,
                profileImage: true
              }
            }
          }
        },
        receiver: {
          select: {
            id: true,
            email: true,
            role: true,
            brandProfile: {
              select: {
                companyName: true,
                logo: true
              }
            },
            influencerProfile: {
              select: {
                firstName: true,
                lastName: true,
                profileImage: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json(message, { status: 201 })
  } catch (error) {
    console.error("Error creating message:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Invalid input data", errors: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    )
  }
}