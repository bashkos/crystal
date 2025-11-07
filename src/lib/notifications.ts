import { prisma } from "./db"

// Keep track of active connections (shared with route handler)
export const activeConnections = new Map<string, any>()

// Function to send notification to a specific user
export function sendNotificationToUser(userId: string, notification: any) {
  const controller = activeConnections.get(userId + ":controller")
  if (controller) {
    try {
      const data = JSON.stringify({
        ...notification,
        timestamp: new Date().toISOString(),
      })
      controller.enqueue(`data: ${data}\n\n`)
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
          controller.enqueue(`data: ${data}\n\n`)
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
              include: {
                user: true
              }
            }
          }
        },
        brandProfile: {
          include: {
            user: true
          }
        }
      }
    })

    if (!campaign) return

    // Notify brand
    if (campaign.brandProfile?.user) {
      await triggerNotification("CAMPAIGN_UPDATE", campaign.brandProfile.user.id, {
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
          include: {
            user: true
          }
        },
        campaign: {
          include: {
            brandProfile: {
              include: {
                user: true
              }
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
      await triggerNotification("NEW_APPLICATION", application.campaign.brandProfile?.user.id || "", {
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
              include: {
                user: true
              }
            },
            influencer: {
              include: {
                user: true
              }
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
    await triggerNotification("PAYMENT_UPDATE", payment.contract.brand.id, {
      title: "Payment Update",
      message,
      paymentId,
      amount: payment.amount,
    })

    // Notify influencer
    if (status === "RELEASED") {
      await triggerNotification("PAYMENT_UPDATE", payment.contract.influencer.id, {
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

