"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Users,
  Building,
  FileText,
  DollarSign,
  MessageSquare,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Settings,
  BarChart3,
  Shield,
  Activity
} from "lucide-react"

interface AdminStats {
  totalUsers: number
  totalBrands: number
  totalInfluencers: number
  totalCampaigns: number
  activeCampaigns: number
  completedCampaigns: number
  totalApplications: number
  pendingApplications: number
  totalContracts: number
  activeContracts: number
  totalRevenue: number
  pendingVerifications: number
  flaggedContent: number
  supportTickets: number
  avgTrustScore: number
  growthRate: number
}

export default function AdminDashboard() {
  const { data: session } = useSession()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [recentActivity, setRecentActivity] = useState<any[]>([])

  useEffect(() => {
    if (session?.user?.role === "ADMIN") {
      fetchStats()
      fetchRecentActivity()
    }
  }, [session])

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/admin/stats")
      if (!response.ok) throw new Error("Failed to fetch admin stats")

      const data = await response.json()
      setStats(data)
    } catch (error) {
      setError("Failed to load admin statistics")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRecentActivity = async () => {
    try {
      // Mock recent activity data
      const mockActivity = [
        {
          id: 1,
          type: "campaign_created",
          user: "Tech Startup Inc",
          details: "Created new campaign 'Summer Product Launch'",
          timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString()
        },
        {
          id: 2,
          type: "user_registered",
          user: "Sarah Johnson",
          details: "New influencer registration",
          timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString()
        },
        {
          id: 3,
          type: "contract_completed",
          user: "Fashion Brand Co",
          details: "Contract completed with @fashionista",
          timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString()
        },
        {
          id: 4,
          type: "flagged_content",
          user: "System",
          details: "Content flagged for review",
          timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString()
        },
        {
          id: 5,
          type: "support_ticket",
          user: "User123",
          details: "Support ticket created regarding payment",
          timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString()
        }
      ]
      setRecentActivity(mockActivity)
    } catch (error) {
      console.error("Error fetching recent activity:", error)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount)
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

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "campaign_created":
        return <FileText className="h-4 w-4 text-blue-600" />
      case "user_registered":
        return <Users className="h-4 w-4 text-green-600" />
      case "contract_completed":
        return <CheckCircle className="h-4 w-4 text-emerald-600" />
      case "flagged_content":
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      case "support_ticket":
        return <MessageSquare className="h-4 w-4 text-orange-600" />
      default:
        return <Activity className="h-4 w-4 text-gray-600" />
    }
  }

  if (session?.user?.role !== "ADMIN") {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <Shield className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access the admin dashboard</p>
          <Link href="/dashboard" className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Go to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button onClick={fetchStats} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const StatCard = ({ title, value, change, icon, format = "number", color = "blue" }: {
    title: string
    value: number
    change?: number
    icon: React.ReactNode
    format?: "number" | "currency" | "percentage"
    color?: "blue" | "green" | "red" | "orange" | "purple"
  }) => {
    const colorClasses = {
      blue: "text-blue-600",
      green: "text-green-600",
      red: "text-red-600",
      orange: "text-orange-600",
      purple: "text-purple-600"
    }

    const isPositive = change === undefined || change >= 0

    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className="text-2xl font-bold">
                {format === "currency" ? formatCurrency(value) :
                 format === "percentage" ? `${value.toFixed(1)}%` :
                 value.toLocaleString()}
              </p>
              {change !== undefined && (
                <div className={`flex items-center text-sm ${
                  isPositive ? "text-green-600" : "text-red-600"
                }`}>
                  {isPositive ? (
                    <TrendingUp className="h-4 w-4 mr-1" />
                  ) : (
                    <TrendingDown className="h-4 w-4 mr-1" />
                  )}
                  {Math.abs(change)}%
                </div>
              )}
            </div>
            <div className={colorClasses[color]}>
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-600">Platform overview and management</p>
        </div>
        <div className="flex space-x-2">
          <Link href="/admin/users">
            <Button variant="outline" size="sm">
              <Users className="h-4 w-4 mr-2" />
              Users
            </Button>
          </Link>
          <Link href="/admin/campaigns">
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              Campaigns
            </Button>
          </Link>
          <Link href="/admin/settings">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </Link>
        </div>
      </div>

      {stats && (
        <>
          {/* Platform Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Users"
              value={stats.totalUsers}
              change={stats.growthRate}
              icon={<Users className="h-6 w-6" />}
              color="blue"
            />
            <StatCard
              title="Active Campaigns"
              value={stats.activeCampaigns}
              change={12.5}
              icon={<FileText className="h-6 w-6" />}
              color="green"
            />
            <StatCard
              title="Total Revenue"
              value={stats.totalRevenue}
              format="currency"
              change={23.8}
              icon={<DollarSign className="h-6 w-6" />}
              color="purple"
            />
            <StatCard
              title="Avg Trust Score"
              value={stats.avgTrustScore}
              format="percentage"
              change={5.2}
              icon={<Shield className="h-6 w-6" />}
              color="orange"
            />
          </div>

          {/* User Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard
              title="Total Brands"
              value={stats.totalBrands}
              change={18.2}
              icon={<Building className="h-6 w-6" />}
              color="blue"
            />
            <StatCard
              title="Total Influencers"
              value={stats.totalInfluencers}
              change={25.6}
              icon={<Users className="h-6 w-6" />}
              color="green"
            />
            <StatCard
              title="Pending Verifications"
              value={stats.pendingVerifications}
              change={-8.3}
              icon={<Clock className="h-6 w-6" />}
              color="orange"
            />
          </div>

          {/* Activity Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard
              title="Total Applications"
              value={stats.totalApplications}
              change={15.7}
              icon={<FileText className="h-6 w-6" />}
              color="blue"
            />
            <StatCard
              title="Active Contracts"
              value={stats.activeContracts}
              change={8.9}
              icon={<BarChart3 className="h-6 w-6" />}
              color="green"
            />
            <StatCard
              title="Flagged Content"
              value={stats.flaggedContent}
              change={-12.4}
              icon={<AlertTriangle className="h-6 w-6" />}
              color="red"
            />
            <StatCard
              title="Support Tickets"
              value={stats.supportTickets}
              change={5.1}
              icon={<MessageSquare className="h-6 w-6" />}
              color="orange"
            />
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Activity className="h-5 w-5 mr-2" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Latest platform activities and events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg">
                    {getActivityIcon(activity.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {activity.user}
                      </p>
                      <p className="text-sm text-gray-600 truncate">
                        {activity.details}
                      </p>
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatTimeAgo(activity.timestamp)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Pending Verifications</CardTitle>
                <CardDescription>
                  User profiles awaiting verification
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-orange-600">
                    {stats.pendingVerifications}
                  </span>
                  <Link href="/admin/verifications">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      Review
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Flagged Content</CardTitle>
                <CardDescription>
                  Content requiring moderation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-red-600">
                    {stats.flaggedContent}
                  </span>
                  <Link href="/admin/moderation">
                    <Button variant="outline" size="sm">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Moderate
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Support Queue</CardTitle>
                <CardDescription>
                  Open support tickets
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-blue-600">
                    {stats.supportTickets}
                  </span>
                  <Link href="/admin/support">
                    <Button variant="outline" size="sm">
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Support
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}