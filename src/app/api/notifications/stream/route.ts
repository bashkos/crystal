import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { activeConnections } from "@/lib/notifications"

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
      const existingConnection = activeConnections.get(userId)
      if (existingConnection && typeof existingConnection.close === 'function') {
        existingConnection.close()
      }
    } catch (error) {
      console.error("Error closing existing connection:", error)
    }
  }

  // Create a new ReadableStream
  const stream = new ReadableStream({
    start(controller) {
      // Store the connection
      activeConnections.set(userId, { close: () => controller.close() })

      // Send initial connection message
      controller.enqueue(`data: {"type":"connected","timestamp":"${new Date().toISOString()}"}\n\n`)

      // Store the controller for sending messages
      activeConnections.set(userId + ":controller", controller)

      // Cleanup on disconnect
      request.signal.addEventListener("abort", () => {
        activeConnections.delete(userId)
        activeConnections.delete(userId + ":controller")
      })

    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  })
}
