"use client"

import { useEffect, useState, useRef } from "react"
import { useSession } from "next-auth/react"

interface Notification {
  id: string
  type: string
  title: string
  message: string
  data?: any
  timestamp: string
  read: boolean
}

export function NotificationCenter() {
  const { data: session } = useSession()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isConnected, setIsConnected] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!session?.user?.id) return

    const connect = () => {
      try {
        const eventSource = new EventSource("/api/notifications/stream")
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)

            if (data.type === "connected") {
              setIsConnected(true)
              return
            }

            // Skip duplicate notifications
            setNotifications(prev => {
              const exists = prev.some(n => n.id === data.id || (n.title === data.title && n.type === data.type))
              if (exists) return prev

              const newNotification: Notification = {
                id: data.id || Math.random().toString(),
                type: data.type,
                title: data.title,
                message: data.message,
                data: data.data,
                timestamp: data.timestamp,
                read: false
              }

              setNotifications(prev => [newNotification, ...prev.slice(0, 9)]) // Keep only last 10

              // Update unread count
              if (!data.read) {
                setUnreadCount(prev => prev + 1)
              }
            } catch (error) {
              console.error("Error parsing notification:", error)
            }
          }

        eventSource.onerror = (error) => {
          console.error("EventSource error:", error)
          setIsConnected(false)
        }

        eventSource.onopen = () => {
          setIsConnected(true)
        }

        eventSource.onclose = () => {
          setIsConnected(false)
          setEventSource(null)
        }

        eventSourceRef.current = eventSource
      } catch (error) {
        console.error("Error connecting to notifications:", error)
        setIsConnected(false)
      }
    }

    connect()

    // Cleanup on unmount
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [session?.user?.id])

  const markAsRead = (notificationId: string) => {
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    )

    setUnreadCount(prev => Math.max(0, prev - 1))
  }

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
    setIsVisible(false)
  }

  const clearNotifications = () => {
    setNotifications([])
    setUnreadCount(0)
  }

  const playNotificationSound = () => {
    // Create a simple notification sound using Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()

      oscillator.frequency.value = 800
      oscillator.type = "sine"
      gainNode.gain.value = 0.1

      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)

      oscillator.start()

      setTimeout(() => {
        gainNode.gain.value = 0
        oscillator.stop()
      }, 200)
    } catch (error) {
      console.error("Error playing notification sound:", error)
    }
  }

  // Auto-play sound for new notifications
  useEffect(() => {
    const lastNotification = notifications[0]
    if (lastNotification && !lastNotification.read && isVisible) {
      playNotificationSound()
    }
  }, [notifications[0]?.id, isVisible])

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return "Just now"
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "CAMPAIGN_UPDATE":
        return <FileText className="h-4 w-4 text-blue-600" />
      case "APPLICATION_UPDATE":
        return <Users className="h-4 w-4 text-green-600" />
      case "NEW_MESSAGE":
        return <MessageSquare className="h-4 w-4 text-purple-600" />
      case "PAYMENT_UPDATE":
        return <DollarSign className="h-4 w-4 text-green-600" />
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />
    }
  }

  return {
    notifications,
    unreadCount,
    isConnected,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    formatTimeAgo,
    getNotificationIcon,
    playNotificationSound
  }
}