"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { NotificationCenter } from "@/components/ui/notifications/NotificationCenter"
import { NotificationsPanel } from "@/components/ui/notifications/NotificationsPanel"
import {
  Bell,
  Archive,
  Settings,
  CheckCircle,
  Eye,
  Filter,
  Download,
  Search,
  Calendar,
  TrendingUp,
  Clock,
  AlertTriangle,
  FileText,
  Users,
  MessageSquare,
  DollarSign
} from "lucide-react"
import Link from "next/link"

interface Notification {
  id: string
  userId: string
  type: string
  title: string
  message: string
  data?: any
  timestamp: string
  isRead: boolean
}

export default function NotificationsPage() {
  const { data: session } = useSession()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [filter, setFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (session?.user?.id) {
      fetchNotifications()
    }
  }, [session?.user?.id])

  const fetchNotifications = async () => {
    try {
      setLoading(true)
      setError("")

      // Mock data for now - in a real app, this would be an API call
      const mockNotifications: Notification[] = [
        {
          id: "1",
          userId: session?.user?.id || "",
          type: "CAMPAIGN_UPDATE",
          title: "Campaign status changed",
          message: "Your 'Summer Collection' campaign is now in review",
          data: { campaignId: "campaign-1", status: "REVIEWING" },
          timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          isRead: false
        },
        {
          id: "2",
          userId: session?.user?.id || "",
          type: "NEW_MESSAGE",
          title: "New message from Tech Startup",
          message: "Your proposal looks great! Let's schedule a call.",
          data: { senderId: "user-2", conversationId: "conversation-1" },
          timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          isRead: false
        },
        {
          id: "3",
          userId: session?.user?.id || "",
          type: "APPLICATION_UPDATE",
          title: "Application reviewed",
          message: "Your application has been shortlisted!",
          data: { applicationId: "app-1", status: "SHORTLISTED" },
          timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
          isRead: false
        },
        {
          id: "4",
          userId: session?.user?.id || "",
          type: "PAYMENT_UPDATE",
          title: "Payment released",
          message: "Payment for contract has been released to your account",
          data: { paymentId: "pay-1", amount: 2500, status: "RELEASED" },
          timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
          isRead: false
        },
      ]

      setNotifications(mockNotifications)
      setTotalPages(1)
    } catch (error) {
      console.error("Error fetching notifications:", error)
      setError("Failed to load notifications")
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      // Mock API call - in real app, this would call the API
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      )
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      // Mock API call
      setNotifications(prev =>
        prev.map(n => ({ ...n, isRead: true }))
      )
    } catch (error) {
      console.error("Error marking all notifications as read:", error)
    }
  }

  const fetchPaginatedNotifications = async (page: number) => {
    try {
      setLoading(true)
      // In a real app, this would include pagination parameters
      // For now, return all notifications
      setNotifications([])
    } catch (error) {
      console.error("Error fetching notifications:", error)
      setError("Failed to fetch notifications")
    } finally {
      setLoading(false)
    }
  }

  const filteredNotifications = notifications.filter(notification => {
    // Apply filters
    if (filter === "unread") return !notification.isRead
    if (filter === "read") return notification.isRead
    if (searchTerm) {
      return (
        notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        notification.message.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    return true
  })

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
        return <Bell className="h-4 w-4 text-gray-600" />
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return "Just now"
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
    return `${Math.floor(diffInMinutes / 1440)}d ago`
  }

  const getStatusColor = (type: string) => {
    switch (type) {
      case "CAMPAIGN_UPDATE":
        return "text-blue-600"
      case "APPLICATION_UPDATE":
        return "text-green-600"
      case "NEW_MESSAGE":
        return "text-purple-600"
      case "PAYMENT_UPDATE":
        return "text-green-600"
      default:
        return "text-gray-600"
    }
  }

  const getPriorityLabel = (type: string) => {
    switch (type) {
      case "CAMPAIGN_UPDATE":
        return "High"
      case "APPLICATION_UPDATE":
        return "Medium"
      case "NEW_MESSAGE":
        return "High"
      case "PAYMENT_UPDATE":
        return "High"
      default:
        return "Normal"
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "CAMPAIGN_UPDATE":
        return "border-blue-500"
      case "APPLICATION_UPDATE":
        return "border-green-500"
      case "NEW_MESSAGE":
        return "border-purple-500"
      case "PAYMENT_UPDATE":
        return "border-green-500"
      default:
        return "border-gray-200"
    }
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

  const markNotificationAsReadMutation = async (notificationId: string) => {
    return handleMarkAsRead(notificationId)
  }

  const markAllAsReadMutation = async () => {
    return handleMarkAllAsRead()
  }

  const clearNotificationsMutation = async () => {
    try {
      setNotifications([])
      return { success: true }
    } catch (error) {
      return { success: false, error }
    }
  }

  const getUnreadCount = () => {
    return unreadCount
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-gray-600">Stay updated with your platform activities</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => window.location.href = "/dashboard/settings"}
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button
            onClick={markAllAsReadMutation}
            disabled={unreadCount === 0}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Mark All as Read
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar with filters */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Status</label>
                <Select value={filter} onValueChange={setFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="unread">Unread</SelectItem>
                    <SelectItem value="read">Read</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Search</label>
                <Input
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="pt-4 border-t">
                <div className="text-sm space-y-2">
                  <div className="flex justify-between">
                    <span>Total:</span>
                    <span className="font-medium">{notifications.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Unread:</span>
                    <span className="font-medium text-red-600">{unreadCount}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main content */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>All Notifications</span>
                <Badge variant="outline">
                  {filteredNotifications.length} items
                </Badge>
              </CardTitle>
              <CardDescription>
                Your recent notifications and updates
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Clock className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : error ? (
                <div className="text-center py-8 text-red-600">
                  {error}
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No notifications found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 rounded-lg border transition-colors ${
                        !notification.isRead ? "bg-blue-50 border-blue-200" : "bg-white border-gray-200"
                      } ${getTypeColor(notification.type)}`}
                    >
                      <div className="flex items-start space-x-4">
                        <div className={`p-2 rounded-full bg-gray-100`}>
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold text-gray-900">
                                {notification.title}
                              </h4>
                              <p className="text-gray-600 mt-1">
                                {notification.message}
                              </p>
                              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                                <span>{formatTimeAgo(notification.timestamp)}</span>
                                <Badge variant="outline" className="text-xs">
                                  {getPriorityLabel(notification.type)}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {!notification.isRead && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => markNotificationAsReadMutation(notification.id)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
                              {notification.data?.campaignId && (
                                <Link href={`/dashboard/campaigns/${notification.data.campaignId}`}>
                                  <Button variant="outline" size="sm">
                                    View
                                  </Button>
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}