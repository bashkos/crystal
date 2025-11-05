"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  Crown,
  Medal,
  Award,
  Target,
  Users,
  BarChart3,
  Calendar,
  Filter,
  Search,
  RefreshCw,
  Star,
  Shield,
  Zap,
  Fire
} from "lucide-react"

interface LeaderboardEntry {
  rank: number
  influencer: {
    id: string
    name: string
    username: string
    avatar?: string
    niche: string[]
    followers: number
    trustScore: number
  }
  score: number
  metrics: {
    performanceScore: number
    engagementRate: number
    contentQuality: number
    consistency: number
    growthRate: number
    trustScore: number
  }
  badges: Array<{
    id: string
    name: string
    icon: string
    color: string
    category: string
  }>
  trend: 'up' | 'down' | 'stable'
}

interface RankingStats {
  totalInfluencers: number
  averageScore: number
  topPerformers: number
  levelDistribution: Record<string, number>
  mostEarnedBadges: Array<{
    id: string
    name: string
    icon: string
    count: number
  }>
}

export default function LeaderboardPage() {
  const { data: session } = useSession()
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [stats, setStats] = useState<RankingStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    type: "global",
    niche: "all",
    timeRange: "month"
  })
  const [searchTerm, setSearchTerm] = useState("")
  const [userRank, setUserRank] = useState<LeaderboardEntry | null>(null)

  useEffect(() => {
    if (session?.user?.id) {
      fetchLeaderboard()
      fetchStats()
    }
  }, [session?.user?.id, filters])

  const fetchLeaderboard = async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams({
        type: filters.type,
        timeRange: filters.timeRange,
        limit: "100"
      })

      if (filters.niche !== "all") {
        params.append("niche", filters.niche)
      }

      const response = await fetch(`/api/ranking/leaderboard?${params}`)
      const data = await response.json()

      if (data.success) {
        setLeaderboard(data.leaderboard)

        // Find current user's rank if they're an influencer
        if (session?.user?.role === "INFLUENCER") {
          const userEntry = data.leaderboard.find(
            (entry: LeaderboardEntry) => entry.influencer.id === session.user.id
          )
          setUserRank(userEntry || null)
        }
      }
    } catch (error) {
      console.error("Error fetching leaderboard:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/ranking/leaderboard?endpoint=stats")
      const data = await response.json()

      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-6 w-6 text-yellow-500" />
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />
    if (rank === 3) return <Award className="h-6 w-6 text-amber-600" />
    return <span className="text-lg font-bold text-gray-600">#{rank}</span>
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-600" />
      default:
        return <Minus className="h-4 w-4 text-gray-600" />
    }
  }

  const getLevelColor = (score: number) => {
    if (score >= 90) return "text-purple-600 bg-purple-100"
    if (score >= 80) return "text-blue-600 bg-blue-100"
    if (score >= 65) return "text-green-600 bg-green-100"
    if (score >= 40) return "text-yellow-600 bg-yellow-100"
    return "text-gray-600 bg-gray-100"
  }

  const getLevelName = (score: number) => {
    if (score >= 90) return "Diamond"
    if (score >= 80) return "Platinum"
    if (score >= 65) return "Gold"
    if (score >= 40) return "Silver"
    return "Bronze"
  }

  const getBadgeIcon = (icon: string) => {
    const iconMap: Record<string, any> = {
      "🎯": Target,
      "⭐": Star,
      "💎": Shield,
      "🔥": Fire,
      "💫": Zap,
      "📅": Calendar,
      "🚀": TrendingUp,
      "🌟": Star
    }
    const Icon = iconMap[icon] || Star
    return <Icon className="h-4 w-4" />
  }

  const formatFollowers = (followers: number) => {
    if (followers >= 1000000) {
      return `${(followers / 1000000).toFixed(1)}M`
    }
    if (followers >= 1000) {
      return `${(followers / 1000).toFixed(1)}K`
    }
    return followers.toString()
  }

  const filteredLeaderboard = leaderboard.filter(entry => {
    if (searchTerm) {
      return entry.influencer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
             entry.influencer.username.toLowerCase().includes(searchTerm.toLowerCase())
    }
    return true
  })

  const niches = ["all", "fashion", "beauty", "tech", "fitness", "food", "travel", "lifestyle"]

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Influencer Leaderboard</h1>
          <p className="text-gray-600">Top-performing creators and their rankings</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={fetchLeaderboard} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Influencers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalInfluencers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Active on platform
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageScore.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">
                Platform average
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Performers</CardTitle>
              <Trophy className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.topPerformers}</div>
              <p className="text-xs text-muted-foreground">
                90+ score
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Level Distribution</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {Object.entries(stats.levelDistribution).slice(0, 3).map(([level, count]) => (
                  <div key={level} className="flex justify-between text-xs">
                    <span>{level}</span>
                    <span>{count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* User Rank Card */}
      {userRank && (
        <Card className="mb-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-blue-600" />
              <span>Your Ranking</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {getRankIcon(userRank.rank)}
                <div>
                  <h3 className="font-semibold text-lg">#{userRank.rank} Overall</h3>
                  <p className="text-sm text-gray-600">
                    Score: {userRank.score}/100 • Level: {getLevelName(userRank.score)}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge className={getLevelColor(userRank.score)}>
                  {getLevelName(userRank.score)}
                </Badge>
                {getTrendIcon(userRank.trend)}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="leaderboard" className="space-y-6">
        <TabsList>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          <TabsTrigger value="achievements">Achievements</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="leaderboard">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Top Influencers</CardTitle>
                  <CardDescription>
                    Ranked by overall performance and platform contributions
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-4">
                  <Input
                    placeholder="Search influencers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                  <Select
                    value={filters.type}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="global">Global</SelectItem>
                      <SelectItem value="niche">By Niche</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={filters.niche}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, niche: value }))}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {niches.map(niche => (
                        <SelectItem key={niche} value={niche}>
                          {niche.charAt(0).toUpperCase() + niche.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={filters.timeRange}
                    onValueChange={(value) => setFilters(prev => ({ ...prev, timeRange: value }))}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="week">This Week</SelectItem>
                      <SelectItem value="month">This Month</SelectItem>
                      <SelectItem value="quarter">This Quarter</SelectItem>
                      <SelectItem value="year">This Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                  <p className="mt-2 text-gray-500">Loading leaderboard...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredLeaderboard.map((entry) => (
                    <div
                      key={entry.influencer.id}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        entry.influencer.id === session?.user?.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                      } transition-colors`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-12">
                          {getRankIcon(entry.rank)}
                        </div>
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={entry.influencer.avatar} />
                          <AvatarFallback>
                            {entry.influencer.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-semibold">{entry.influencer.name}</h4>
                          <p className="text-sm text-gray-600">@{entry.influencer.username}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {entry.influencer.niche.join(', ')}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {formatFollowers(entry.influencer.followers)} followers
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-6">
                        <div className="text-right">
                          <div className="font-bold text-lg">{entry.score}/100</div>
                          <div className="flex items-center space-x-1">
                            {getTrendIcon(entry.trend)}
                            <Badge className={`text-xs ${getLevelColor(entry.score)}`}>
                              {getLevelName(entry.score)}
                            </Badge>
                          </div>
                        </div>

                        <div className="flex items-center space-x-1">
                          {entry.badges.slice(0, 3).map((badge) => (
                            <div
                              key={badge.id}
                              className="p-1 rounded-full bg-gray-100"
                              title={badge.name}
                            >
                              {badge.icon}
                            </div>
                          ))}
                          {entry.badges.length > 3 && (
                            <div className="text-xs text-gray-500">+{entry.badges.length - 3}</div>
                          )}
                        </div>

                        <div className="text-right text-sm text-gray-600">
                          <div>Performance: {entry.metrics.performanceScore.toFixed(0)}%</div>
                          <div>Engagement: {entry.metrics.engagementRate.toFixed(1)}%</div>
                          <div>Quality: {entry.metrics.contentQuality.toFixed(0)}%</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="achievements">
          <Card>
            <CardHeader>
              <CardTitle>Achievements & Badges</CardTitle>
              <CardDescription>
                Most earned badges across the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {stats.mostEarnedBadges.map((badge) => (
                    <div key={badge.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <div className="text-2xl">{badge.icon}</div>
                      <div>
                        <h4 className="font-medium">{badge.name}</h4>
                        <p className="text-sm text-gray-600">Earned by {badge.count} creators</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Ranking Analytics</CardTitle>
              <CardDescription>
                Platform-wide ranking insights and trends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Advanced ranking analytics coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}