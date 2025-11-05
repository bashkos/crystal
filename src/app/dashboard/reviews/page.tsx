"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import {
  Star,
  MessageSquare,
  Search,
  Filter,
  Calendar,
  User,
  ThumbsUp,
  Eye,
  TrendingUp,
  Award,
  Clock
} from "lucide-react"

interface Review {
  id: string
  ratingScores: any
  reviewText: string
  recommendationScore: number
  isPublic: boolean
  createdAt: string
  helpfulVotes: number
  reviewer: {
    id: string
    email: string
    role: string
    brandProfile?: {
      companyName: string
      logo?: string
    }
    influencerProfile?: {
      firstName: string
      lastName: string
      profileImage?: string
    }
  }
  reviewee: {
    id: string
    email: string
    role: string
    brandProfile?: {
      companyName: string
      logo?: string
    }
    influencerProfile?: {
      firstName: string
      lastName: string
      profileImage?: string
    }
  }
  contract: {
    id: string
    campaign: {
      title: string
      category: string
    }
  }
}

export default function ReviewsPage() {
  const { data: session } = useSession()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [ratingFilter, setRatingFilter] = useState("")
  const [sortBy, setSortBy] = useState("recent")
  const [total, setTotal] = useState(0)
  const [stats, setStats] = useState({
    averageRating: 0,
    totalReviews: 0,
    averageRecommendation: 0,
    totalReviewsReceived: 0
  })

  const isAdmin = session?.user?.role === "ADMIN"

  useEffect(() => {
    fetchReviews()
    if (isAdmin) {
      fetchStats()
    }
  }, [session, sortBy, ratingFilter, searchTerm])

  const fetchReviews = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        ...(ratingFilter && { minRating: ratingFilter }),
        ...(searchTerm && { search: searchTerm }),
        limit: "20"
      })

      const endpoint = isAdmin ? "/api/reviews?limit=50" : `/api/reviews?${params}`
      const response = await fetch(endpoint)

      if (!response.ok) throw new Error("Failed to fetch reviews")

      const data = await response.json()
      setReviews(data.reviews || data)
      setTotal(data.pagination?.total || data.length || 0)
    } catch (error) {
      setError("Failed to load reviews")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      // Fetch user's review statistics
      const response = await fetch(`/api/users/${session?.user?.id}/stats`)
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    })
  }

  const getAverageRating = (ratingScores: any) => {
    const scores = Object.values(ratingScores).filter((r): r is number => typeof r === "number" && r > 0)
    if (scores.length === 0) return 0
    return scores.reduce((sum, score) => sum + score, 0) / scores.length
  }

  const getDisplayName = (user: any) => {
    if (user.role === "BRAND" && user.brandProfile) {
      return user.brandProfile.companyName
    } else if (user.role === "INFLUENCER" && user.influencerProfile) {
      return `${user.influencerProfile.firstName} ${user.influencerProfile.lastName}`
    }
    return user.email
  }

  const getAvatar = (user: any) => {
    if (user.brandProfile?.logo) {
      return user.brandProfile.logo
    } else if (user.influencerProfile?.profileImage) {
      return user.influencerProfile.profileImage
    }
    return undefined
  }

  const StarDisplay = ({ rating }: { rating: number }) => (
    <div className="flex items-center space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating
              ? "fill-yellow-400 text-yellow-400"
              : "text-gray-300"
          }`}
        />
      ))}
      <span className="text-sm text-gray-600 ml-1">({rating.toFixed(1)})</span>
    </div>
  )

  const RecommendationDisplay = ({ score }: { score: number }) => {
    const getColor = (score: number) => {
      if (score >= 8) return "text-green-600"
      if (score >= 6) return "text-yellow-600"
      return "text-red-600"
    }

    return (
      <div className={`flex items-center space-x-1 ${getColor(score)}`}>
        <TrendingUp className="h-4 w-4" />
        <span className="font-semibold">{score}/10</span>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Reviews</h1>
            <p className="text-gray-600">Manage and view reviews</p>
          </div>
        </div>
        <div className="grid gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reviews</h1>
          <p className="text-gray-600">
            {isAdmin ? "Platform review management" : "Manage reviews and feedback"}
            {total > 0 && ` • ${total} review${total !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {session && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Average Rating</p>
                  <p className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</p>
                </div>
                <Star className="h-8 w-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Reviews Given</p>
                  <p className="text-2xl font-bold">{stats.totalReviews}</p>
                </div>
                <MessageSquare className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Recommendation</p>
                  <p className="text-2xl font-bold">{stats.averageRecommendation.toFixed(1)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Reviews Received</p>
                  <p className="text-2xl font-bold">{stats.totalReviewsReceived}</p>
                </div>
                <Award className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search reviews..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Select value={ratingFilter} onValueChange={setRatingFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Min Rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Ratings</SelectItem>
                  <SelectItem value="4">4+ Stars</SelectItem>
                  <SelectItem value="3">3+ Stars</SelectItem>
                  <SelectItem value="2">2+ Stars</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most Recent</SelectItem>
                  <SelectItem value="rating">Highest Rated</SelectItem>
                  <SelectItem value="recommendation">Most Recommended</SelectItem>
                  <SelectItem value="helpful">Most Helpful</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      {error ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-red-600">{error}</p>
            <Button onClick={fetchReviews} className="mt-2">
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : reviews.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No reviews found</h3>
            <p className="text-gray-600">
              {searchTerm || ratingFilter
                ? "No reviews match your filters. Try adjusting your criteria."
                : "No reviews available yet."
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {reviews.map((review) => (
            <Card key={review.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  {/* Reviewer Info */}
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={getAvatar(review.reviewer)} />
                    <AvatarFallback>
                      {getDisplayName(review.reviewer).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-semibold">
                            {getDisplayName(review.reviewer)}
                          </h3>
                          <Badge variant="outline" className="text-xs">
                            {review.reviewer.role}
                          </Badge>
                          <div className="flex items-center space-x-1 text-gray-500">
                            <Clock className="h-3 w-3" />
                            <span className="text-xs">{formatDate(review.createdAt)}</span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600">
                          reviewed {getDisplayName(review.reviewee)} •
                          <Link href={`/dashboard/campaigns/${review.contract.campaign.id}`} className="text-blue-600 hover:underline">
                            {review.contract.campaign.title}
                          </Link>
                        </p>
                      </div>
                    </div>

                    {/* Ratings */}
                    <div className="space-y-2 mb-3">
                      <StarDisplay rating={getAverageRating(review.ratingScores)} />
                      <RecommendationDisplay score={review.recommendationScore} />
                    </div>

                    {/* Review Text */}
                    <p className="text-gray-700 mb-4 leading-relaxed">
                      {review.reviewText}
                    </p>

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span className="flex items-center space-x-1">
                          <Eye className="h-4 w-4" />
                          <span>{review.isPublic ? "Public" : "Private"}</span>
                        </span>
                        {review.helpfulVotes > 0 && (
                          <span className="flex items-center space-x-1">
                            <ThumbsUp className="h-4 w-4" />
                            <span>{review.helpfulVotes} helpful</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}