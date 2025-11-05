import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"

// Keep track of active connections
const activeConnections = new Map<string, Response>()

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json(
      { message: "Unauthorized" },
      { status: 401 }
    )
  }

  const userId = session.user.id

  // Check if user already has an active connection
  if (activeConnections.has(userId)) {
    try {
      activeConnections.get(userId)?.close()
    } catch (error) {
      console.error("Error closing existing connection:", error)
    }
  }

  // Create a new ReadableStream
  const stream = new ReadableStream({
    start(controller) {
      const response = new Response(controller.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          "Connection": "keep-alive",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Cache-Control",
        },
      })

      // Store the connection
      activeConnections.set(userId, response)

      // Send initial connection message
      controller.enqueue(`data: {"type":"connected","timestamp":"${new Date().toISOString()}"}

      // Store the controller for sending messages
      activeConnections.set(userId + ":controller", controller)

      // Cleanup on disconnect
      request.signal.addEventListener("abort", () => {
        activeConnections.delete(userId)
        activeConnections.delete(userId + ":controller")
      })

      return response as any
    },
  })
}

// Function to send notification to a specific user
export function sendNotificationToUser(userId: string, notification: any) {
  const controller = activeConnections.get(userId + ":controller")
  if (controller) {
    try {
      const data = JSON.stringify({
        ...notification,
        timestamp: new Date().toISOString(),
      })
      controller.enqueue(`data: ${data}`)
    } catch (error) {
      console.error("Error sending notification:", error)
      // Clean up dead connections
      activeConnections.delete(userId)
      activeConnections.delete(userId + ":controller")
    }
  }
}

// Function to broadcast notification to all users
export function broadcastNotification(notification: any, excludeUser?: string) {
  activeConnections.forEach((_, key) => {
    if (key.endsWith(":controller") && (!excludeUser || !key.startsWith(excludeUser))) {
      const controller = activeConnections.get(key)
      if (controller) {
        try {
          const data = JSON.stringify({
            ...notification,
            timestamp: new Date().toISOString(),
          })
          controller.enqueue(`data: ${data}`)
        } catch (error) {
          console.error("Error broadcasting notification:", error)
        }
      }
    }
  })
}

// Function to trigger notification for specific events
export async function triggerNotification(
  type: string,
  userId: string,
  data: any
) {
  const notification = {
    type,
    userId,
    ...data,
  }

  sendNotificationToUser(userId, notification)

  // Store notification in database
  try {
    await prisma.notification.create({
      data: {
        userId,
        type,
        title: data.title || "Notification",
        message: data.message || "",
        data: JSON.stringify(data),
        isRead: false,
        createdAt: new Date(),
      }
    })
  } catch (error) {
    console.error("Error storing notification:", error)
  }
}

// Function to send campaign-related notifications
export async function notifyCampaignUpdate(campaignId: string, type: string, data: any) {
  try {
    // Get campaign with applications
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        applications: {
          include: {
            influencer: {
              user: true
            }
          }
        }
      }
    })

    if (!campaign) return

    // Notify brand
    if (campaign.brand) {
      await triggerNotification("CAMPAIGN_UPDATE", campaign.brand.userId, {
        title: data.title,
        message: data.message,
        campaignId,
        campaignTitle: campaign.title,
      })
    }

    // Notify applicants
    if (campaign.applications) {
      for (const application of campaign.applications) {
        await triggerNotification("CAMPAIGN_UPDATE", application.influencer.user.id, {
          title: data.title,
          message: data.message,
          campaignId,
          campaignTitle: campaign.title,
        })
      }
    }
  } catch (error) {
    console.error("Error notifying campaign update:", error)
  }
}

// Function to send application status updates
export async function notifyApplicationUpdate(applicationId: string, status: string, data: any) {
  try {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        influencer: {
          user: true
        },
        campaign: {
          include: {
            brand: {
              user: true
            }
          }
        }
      }
    })

    if (!application) return

    const messages = {
      UNDER_REVIEW: "Your application is being reviewed",
      SHORTLISTED: "Congratulations! You've been shortlisted",
      HIRED: "Great news! You've been hired for this campaign",
      REJECTED: "Your application was not selected for this campaign"
    }

    const message = messages[status as keyof typeof messages] || `Application status updated to ${status}`

    // Notify influencer
    await triggerNotification("APPLICATION_UPDATE", application.influencer.user.id, {
      title: `Application Status Update`,
      message,
      applicationId,
      status,
      campaignTitle: application.campaign.title,
    })

    // Notify brand
    if (status === "SUBMITTED") {
      await triggerNotification("NEW_APPLICATION", application.campaign.brand.user.id, {
        title: "New Application Received",
        message: `${application.influencer.user.email} applied to ${application.campaign.title}`,
        applicationId,
        campaignTitle: application.campaign.title,
      })
    }
  } catch (error) {
    console.error("Error notifying application update:", error)
  }
}

// Function to send message notifications
export async function notifyNewMessage(messageId: string) {
  try {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: true,
        receiver: true,
      }
    })

    if (!message) return

    // Notify receiver if they're not the sender
    await triggerNotification("NEW_MESSAGE", message.receiverId, {
      title: "New Message",
      message: `New message from ${message.sender.email}`,
      messageId,
      senderName: message.sender.email,
    })
  } catch (error) {
    console.error("Error notifying new message:", error)
  }
}

// Function to send payment notifications
export async function notifyPaymentUpdate(paymentId: string, status: string, data: any) {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        contract: {
          include: {
            brand: {
              user: true
            },
            influencer: {
              user: true
            }
          }
        }
      }
    })

    if (!payment) return

    const messages = {
      HELD: "Payment has been held in escrow",
      RELEASED: "Payment has been released",
      FAILED: "Payment processing failed"
    }

    const message = messages[status as keyof typeof messages] || `Payment status updated to ${status}`

    // Notify brand
    await triggerNotification("PAYMENT_UPDATE", payment.contract.brand.user.id, {
      title: "Payment Update",
      message,
      paymentId,
      amount: payment.amount,
    })

    // Notify influencer
    if (status === "RELEASED") {
      await triggerNotification("PAYMENT_UPDATE", payment.contract.influencer.user.id, {
        title: "Payment Received",
        message,
        paymentId,
        amount: payment.amount,
      })
    }
  } catch (error) {
    console.error("Error notifying payment update:", error)
  }
}