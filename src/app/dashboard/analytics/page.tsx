"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  FileText,
  Eye,
  Target,
  Calendar,
  BarChart3,
  PieChart,
  Activity
} from "lucide-react"

interface AnalyticsData {
  campaignMetrics?: {
    total: number
    active: number
    completed: number
    completionRate: number
  }
  applicationMetrics?: {
    total: number
    hired: number
    hireRate: number
    successRate?: number
    activeContracts?: number
  }
  financialMetrics?: {
    totalSpent?: number
    avgContractValue?: number
    totalContracts?: number
    totalEarnings?: number
    avgEarningsPerContract?: number
    completedContracts?: number
    projectedMonthly?: number
  }
  engagementMetrics?: {
    avgEngagementRate: number
    totalSubmissions: number
    approvalRate?: number
    avgRevisionRate?: number
  }
  performanceMetrics?: {
    trustScore: number
    avgRating: number
    totalReviews: number
  }
  categoryBreakdown?: Record<string, { count: number; total?: number; earnings?: number }>
  trends?: Array<{
    date: string
    campaigns?: number
    applications?: number
    spend?: number
    engagement?: number
    earnings?: number
    submissions?: number
    views?: number
  }>
}

export default function AnalyticsPage() {
  const { data: session } = useSession()
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState("30d")
  const [error, setError] = useState("")

  const isBrand = session?.user?.role === "BRAND"

  useEffect(() => {
    fetchAnalytics()
  }, [session, period])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/analytics/overview?period=${period}`)
      if (!response.ok) throw new Error("Failed to fetch analytics")

      const data = await response.json()
      setAnalytics(data)
    } catch (error) {
      setError("Failed to load analytics data")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const MetricCard = ({ title, value, change, icon, format = "number" }: {
    title: string
    value: number
    change?: number
    icon: React.ReactNode
    format?: "number" | "currency" | "percentage"
  }) => {
    const isPositive = change === undefined || change >= 0

    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{title}</p>
              <p className="text-2xl font-bold">
                {format === "currency" ? formatCurrency(value) :
                 format === "percentage" ? formatPercentage(value) :
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
                  {formatPercentage(Math.abs(change))}
                </div>
              )}
            </div>
            <div className="text-blue-600">
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Analytics</h1>
            <p className="text-gray-600">
              {isBrand ? "Brand performance metrics" : "Influencer performance metrics"}
            </p>
          </div>
          <Select value={period} onValueChange={setPeriod} disabled>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-16 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error || !analytics) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Analytics</h1>
            <p className="text-gray-600">Performance metrics</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <BarChart3 className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Analytics Unavailable</h3>
            <p className="text-gray-600">{error || "Unable to load analytics data"}</p>
            <button onClick={fetchAnalytics} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Try Again
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-gray-600">
            {isBrand ? "Brand performance metrics" : "Influencer performance metrics"}
          </p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="1y">Last year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isBrand ? (
        <>
          {/* Brand Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Campaigns"
              value={analytics.campaignMetrics?.total || 0}
              change={15.2}
              icon={<FileText className="h-6 w-6" />}
            />
            <MetricCard
              title="Active Campaigns"
              value={analytics.campaignMetrics?.active || 0}
              change={-5.1}
              icon={<Target className="h-6 w-6" />}
            />
            <MetricCard
              title="Completion Rate"
              value={analytics.campaignMetrics?.completionRate || 0}
              format="percentage"
              change={8.7}
              icon={<Activity className="h-6 w-6" />}
            />
            <MetricCard
              title="Total Spent"
              value={analytics.financialMetrics?.totalSpent || 0}
              format="currency"
              change={23.5}
              icon={<DollarSign className="h-6 w-6" />}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Applications Received"
              value={analytics.applicationMetrics?.total || 0}
              change={12.3}
              icon={<Users className="h-6 w-6" />}
            />
            <MetricCard
              title="Hired Influencers"
              value={analytics.applicationMetrics?.hired || 0}
              change={18.9}
              icon={<Users className="h-6 w-6" />}
            />
            <MetricCard
              title="Hire Rate"
              value={analytics.applicationMetrics?.hireRate || 0}
              format="percentage"
              change={2.4}
              icon={<TrendingUp className="h-6 w-6" />}
            />
            <MetricCard
              title="Avg Engagement"
              value={analytics.engagementMetrics?.avgEngagementRate || 0}
              change={-1.2}
              icon={<Eye className="h-6 w-6" />}
            />
          </div>
        </>
      ) : (
        <>
          {/* Influencer Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Applications"
              value={analytics.applicationMetrics?.total || 0}
              change={22.5}
              icon={<FileText className="h-6 w-6" />}
            />
            <MetricCard
              title="Success Rate"
              value={analytics.applicationMetrics?.successRate || 0}
              format="percentage"
              change={5.8}
              icon={<Target className="h-6 w-6" />}
            />
            <MetricCard
              title="Active Contracts"
              value={analytics.applicationMetrics?.activeContracts || 0}
              change={-3.2}
              icon={<Calendar className="h-6 w-6" />}
            />
            <MetricCard
              title="Trust Score"
              value={analytics.performanceMetrics?.trustScore || 0}
              format="percentage"
              change={7.9}
              icon={<Award className="h-6 w-6" />}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Earnings"
              value={analytics.earningsMetrics?.totalEarnings || 0}
              format="currency"
              change={31.2}
              icon={<DollarSign className="h-6 w-6" />}
            />
            <MetricCard
              title="Avg per Contract"
              value={analytics.earningsMetrics?.avgEarningsPerContract || 0}
              format="currency"
              change={12.7}
              icon={<BarChart3 className="h-6 w-6" />}
            />
            <MetricCard
              title="Completed Contracts"
              value={analytics.earningsMetrics?.completedContracts || 0}
              change={18.4}
              icon={<CheckCircle className="h-6 w-6" />}
            />
            <MetricCard
              title="Approval Rate"
              value={analytics.contentMetrics?.avgApprovalRate || 0}
              format="percentage"
              change={3.1}
              icon={<Activity className="h-6 w-6" />}
            />
          </div>
        </>
      )}

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="h-5 w-5 mr-2" />
              Category Breakdown
            </CardTitle>
            <CardDescription>
              Performance by {isBrand ? "campaign" : "content"} category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.categoryBreakdown && Object.entries(analytics.categoryBreakdown)
                .sort(([,a], [,b]) => (b.count || b.earnings || 0) - (a.count || a.earnings || 0))
                .slice(0, 5)
                .map(([category, data]) => (
                  <div key={category} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{category}</Badge>
                      <span className="text-sm text-gray-600">
                        {data.count} {isBrand ? "campaigns" : "contracts"}
                      </span>
                    </div>
                    <span className="font-medium">
                      {isBrand ? formatCurrency(data.total || 0) : formatCurrency(data.earnings || 0)}
                    </span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Summary</CardTitle>
            <CardDescription>
              Key performance indicators
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Average Rating</span>
                <div className="flex items-center space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <div
                      key={star}
                      className={`w-2 h-2 rounded-full ${
                        star <= (analytics.performanceMetrics?.avgRating || 0)
                          ? "bg-yellow-400"
                          : "bg-gray-300"
                      }`}
                    />
                  ))}
                  <span className="text-sm font-medium">
                    {analytics.performanceMetrics?.avgRating.toFixed(1) || "0.0"}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Total Reviews</span>
                <span className="font-medium">
                  {analytics.performanceMetrics?.totalReviews || 0}
                </span>
              </div>

              {isBrand ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Avg Contract Value</span>
                    <span className="font-medium">
                      {formatCurrency(analytics.financialMetrics?.avgContractValue || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Submissions</span>
                    <span className="font-medium">
                      {analytics.engagementMetrics?.totalSubmissions || 0}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Projected Monthly</span>
                    <span className="font-medium">
                      {formatCurrency(analytics.earningsMetrics?.projectedMonthly || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Submissions</span>
                    <span className="font-medium">
                      {analytics.contentMetrics?.totalSubmissions || 0}
                    </span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function CheckCircle({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}