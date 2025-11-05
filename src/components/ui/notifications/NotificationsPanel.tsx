"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Bell,
  BellOff,
  CheckCircle,
  X,
  ChevronDown,
  Eye,
  Settings,
  Archive,
  Info
} from "lucide-react"
import { NotificationCenter } from "./NotificationCenter"
import Link from "next/link"

export default function NotificationsPanel() {
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [filter, setFilter] = useState("all")

  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    formatTimeAgo,
    getNotificationIcon
  } = NotificationCenter()

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case "unread":
        return !notification.read
      case "read":
        return notification.read
      default:
        return true
    }
  })

  const handleMarkAsRead = (notificationId: string) => {
    markAsRead(notificationId)
  }

  const handleClearAll = () => {
    clearNotifications()
  }

  const handleViewAll = () => {
    markAllAsRead()
    // Navigate to notifications page
    window.location.href = "/dashboard/notifications"
  }

  if (!session?.user) {
    return null
  }

  return (
    <div className="relative">
      {/* Notification Bell Button */}
      <Button
        variant="outline"
        size="sm"
        className="relative p-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className={`h-4 w-4 ${unreadCount > 0 ? "animate-pulse" : ""}`} />
        {unreadCount > 0 && (
          <Badge
            className="absolute -top-1 -right-1 h-5 w-5 text-xs bg-red-500 text-white rounded-full flex items-center justify-center"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Notifications Panel */}
      {isOpen && (
        <div className="absolute right-0 top-12 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-sm font-semibold">Notifications</h3>
            <div className="flex items-center space-x-2">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("all")}
              >
                All
              </Button>
              <Button
                variant={filter === "unread" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("unread")}
              >
                Unread
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {filteredNotifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-gray-500">
                No notifications
              </div>
            ) : (
              <div className="space-y-2">
                {filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`
                      p-4 hover:bg-gray-50 cursor-pointer rounded-lg transition-colors
                      ${!notification.read ? "bg-blue-50" : "bg-white"}
                      ${unreadCount > 0 ? "border-l-4 border-blue-500" : ""}
                    `}
                    onClick={() => handleMarkAsRead(notification.id)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`p-1 rounded-full ${getNotificationColor(notification.type)}`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 line-clamp-1">
                          {notification.title}
                        </p>
                        <p className="text-xs text-gray-500 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center space-x-2 text-xs text-gray-400">
                          <span>{formatTimeAgo(notification.timestamp)}</span>
                          {!notification.read && (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Notification actions */}
                    <div className="flex items-center space-x-2 ml-auto">
                      {!notification.read && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleMarkAsRead(notification.id)
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          // Navigate to related page
                          if (notification.data?.campaignId) {
                            window.location.href = `/dashboard/campaigns/${notification.data.campaignId}`
                          } else if (notification.data?.applicationId) {
                            window.location.href = `/dashboard/applications/${notification.data.applicationId}`
                          } else if (notification.data?.contractId) {
                            window.location.href = `/dashboard/contracts/${notification.data.contractId}`
                          }
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewAll}
              className="text-xs"
            >
              View All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              className="text-xs"
            >
              Clear All
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function getNotificationColor(type: string): string {
  switch (type) {
    case "CAMPAIGN_UPDATE":
      return "bg-blue-100"
    case "APPLICATION_UPDATE":
      return "bg-green-100"
    case "NEW_MESSAGE":
      return "bg-purple-100"
    case "PAYMENT_UPDATE":
      return "bg-green-100"
    default:
      return "bg-gray-100"
  }
}