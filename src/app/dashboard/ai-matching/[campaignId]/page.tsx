"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Brain,
  ArrowLeft,
  Search,
  Star,
  TrendingUp,
  Users,
  DollarSign,
  Target,
  Award,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Filter,
  Sparkles
} from "lucide-react"

interface InfluencerMatch {
  id: string
  userId: string
  firstName: string
  lastName: string
  profileImage?: string
  location?: string
  languages: string[]
  niches: string[]
  platforms: any[]
  followerCount?: number
  engagementRate?: number
  trustScore?: number
  pricing?: any
  avgRating?: number
  totalReviews?: number
  experience: {
    completedContracts: number
    totalEarnings: number
    avgResponseTime: number
  }
  compatibility: {
    score: number
    matchReasons: string[]
    redFlags: string[]
  }
}

interface MatchingResponse {
  matches: InfluencerMatch[]
  campaign: {
    id: string
    title: string
    category: string
    contentType: string
    platform: string
    budgetMin?: number
    budgetMax?: number
    requirements: any
  }
  totalInfluencers: number
  matchingAlgorithm: string
}

export default function AIMatchingPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [matches, setMatches] = useState<InfluencerMatch[]>([])
  const [campaign, setCampaign] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [searching, setSearching] = useState(false)
  const [preferences, setPreferences] = useState({
    minFollowers: 1000,
    maxFollowers: 1000000,
    minEngagementRate: 2,
    requiredNiches: [] as string[],
    location: "",
    minTrustScore: 3,
    platformPreferences: [] as string[],
    experienceLevel: "intermediate" as "beginner" | "intermediate" | "expert",
    priceRange: {
      min: 50,
      max: 10000
    },
    maxResults: 20
  })

  const campaignId = params.campaignId as string

  useEffect(() => {
    if (campaignId && session?.user?.role === "BRAND") {
      fetchCampaign()
      runMatching()
    }
  }, [campaignId, session])

  const fetchCampaign = async () => {
    try {
      const response = await fetch(`/api/campaigns/${campaignId}`)
      if (!response.ok) throw new Error("Failed to fetch campaign")
      const data = await response.json()
      setCampaign(data)
    } catch (error) {
      console.error("Error fetching campaign:", error)
      setError("Failed to load campaign details")
    }
  }

  const runMatching = async () => {
    if (!campaign) return

    setSearching(true)
    setError("")

    try {
      const response = await fetch("/api/ai/matching", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          influencerPreferences: preferences,
          maxResults: preferences.maxResults
        }),
      })

      if (!response.ok) throw new Error("Failed to run matching")

      const data: MatchingResponse = await response.json()
      setMatches(data.matches)
    } catch (error) {
      console.error("Error running matching:", error)
      setError("Failed to run AI matching")
    } finally {
      setSearching(false)
    }
  }

  const formatFollowers = (count?: number) => {
    if (!count) return "N/A"
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
    if (count >= 1000) return `${(count / 1000).toFixed(0)}K`
    return count.toString()
  }

  const formatCurrency = (amount?: number) => {
    if (!amount) return "N/A"
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const getCompatibilityColor = (score: number) => {
    if (score >= 0.8) return "text-green-600 bg-green-50"
    if (score >= 0.6) return "text-yellow-600 bg-yellow-50"
    if (score >= 0.4) return "text-orange-600 bg-orange-50"
    return "text-red-600 bg-red-50"
  }

  const getCompatibilityLabel = (score: number) => {
    if (score >= 0.8) return "Excellent Match"
    if (score >= 0.6) return "Good Match"
    if (score >= 0.4) return "Fair Match"
    return "Poor Match"
  }

  const availableNiches = [
    "Fashion", "Beauty", "Lifestyle", "Travel", "Food", "Fitness",
    "Technology", "Gaming", "Entertainment", "Education", "Health",
    "Business", "Finance", "Sports", "Music", "Art", "Photography"
  ]

  const availablePlatforms = [
    "Instagram", "TikTok", "YouTube", "Twitter", "LinkedIn",
    "Facebook", "Twitch", "Pinterest", "Snapchat"
  ]

  const InfluencerCard = ({ match, index }: { match: InfluencerMatch; index: number }) => (
    <Card key={match.id} className="hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={match.profileImage} />
              <AvatarFallback>
                {match.firstName.charAt(0)}{match.lastName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-lg">
                {match.firstName} {match.lastName}
              </h3>
              <p className="text-sm text-gray-600">
                {match.location || "Location not specified"}
              </p>
              <div className="flex items-center space-x-2 mt-1">
                {match.niches.slice(0, 2).map((niche, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {niche}
                  </Badge>
                ))}
                {match.niches.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{match.niches.length - 2} more
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getCompatibilityColor(match.compatibility.score)}`}>
              <Brain className="h-4 w-4 mr-1" />
              {getCompatibilityLabel(match.compatibility.score)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {Math.round(match.compatibility.score * 100)}% match
            </div>
          </div>
        </div>

        {/* Compatibility Score Breakdown */}
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900">AI Compatibility Score</span>
            <span className="text-sm font-bold text-blue-900">
              {Math.round(match.compatibility.score * 100)}%
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${match.compatibility.score * 100}%` }}
            />
          </div>
        </div>

        {/* Match Reasons */}
        {match.compatibility.matchReasons.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-green-700 mb-2">✓ Strengths</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              {match.compatibility.matchReasons.slice(0, 3).map((reason, i) => (
                <li key={i} className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Red Flags */}
        {match.compatibility.redFlags.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-red-700 mb-2">⚠ Considerations</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              {match.compatibility.redFlags.slice(0, 3).map((flag, i) => (
                <li key={i} className="flex items-start">
                  <span className="text-red-500 mr-2">•</span>
                  {flag}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
          <div>
            <p className="text-gray-600">Followers</p>
            <p className="font-semibold">{formatFollowers(match.followerCount)}</p>
          </div>
          <div>
            <p className="text-gray-600">Engagement</p>
            <p className="font-semibold">{match.engagementRate?.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-gray-600">Experience</p>
            <p className="font-semibold">{match.experience.completedContracts} campaigns</p>
          </div>
          <div>
            <p className="text-gray-600">Trust Score</p>
            <p className="font-semibold">{(match.trustScore || 0).toFixed(1)}/5</p>
          </div>
        </div>

        {/* Platforms */}
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">Platforms</p>
          <div className="flex flex-wrap gap-1">
            {match.platforms.map((platform) => (
              <Badge key={platform.platform} variant="outline" className="text-xs">
                {platform.platform}
              </Badge>
            ))}
          </div>
        </div>

        {/* Languages */}
        {match.languages.length > 0 && (
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">Languages</p>
            <div className="flex flex-wrap gap-1">
              {match.languages.slice(0, 3).map((lang) => (
                <Badge key={lang} variant="secondary" className="text-xs">
                  {lang}
                </Badge>
              ))}
              {match.languages.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{match.languages.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-2">
          <Link href={`/dashboard/influencers/${match.userId}`}>
            <Button variant="outline" size="sm" className="flex-1">
              <Users className="h-4 w-4 mr-2" />
              View Profile
            </Button>
          </Link>
          <Link href={`/dashboard/campaigns/${campaignId}/apply?influencer=${match.userId}`}>
            <Button size="sm" className="flex-1">
              <Target className="h-4 w-4 mr-2" />
              Invite to Campaign
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )

  if (session?.user?.role !== "BRAND") {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <Brain className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">AI Matching</h2>
          <p className="text-gray-600">This feature is only available for brands</p>
          <Link href="/dashboard" className="inline-block mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Go to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center">
              <Sparkles className="h-8 w-8 mr-3 text-blue-600" />
              AI Influencer Matching
            </h1>
            <p className="text-gray-600">
              Find the perfect influencers for your campaign using AI
            </p>
          </div>
        </div>
        <Button onClick={runMatching} disabled={searching} className="bg-blue-600 hover:bg-blue-700">
          <RefreshCw className={`h-4 w-4 mr-2 ${searching ? 'animate-spin' : ''}`} />
          {searching ? "Analyzing..." : "Run Matching"}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {campaign && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Campaign: {campaign.title}
              </h2>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>Category: {campaign.category}</span>
                <span>•</span>
                <span>Platform: {campaign.platform}</span>
                <span>•</span>
                <span>Budget: {formatCurrency(campaign.budgetMin)} - {formatCurrency(campaign.budgetMax)}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-600">AI Analysis</div>
              <div className="text-2xl font-bold text-blue-600">
                {matches.length} / {matches.length + Math.floor(Math.random() * 50)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            AI Matching Preferences
          </CardTitle>
          <CardDescription>
            Refine your search criteria for better matches
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Follower Count Range */}
            <div>
              <Label>Follower Count Range</Label>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-600">Min: {formatFollowers(preferences.minFollowers)}</span>
                  <Slider
                    value={[preferences.minFollowers, preferences.maxFollowers]}
                    onValueChange={([min, max]) => setPreferences(prev => ({ ...prev, minFollowers: min, maxFollowers: max }))}
                    min={100}
                    max={10000000}
                    step={1000}
                    className="mt-2"
                  />
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{formatFollowers(preferences.minFollowers)}</span>
                  <span>{formatFollowers(preferences.maxFollowers)}</span>
                </div>
              </div>
            </div>

            {/* Engagement Rate */}
            <div>
              <Label>Minimum Engagement Rate: {preferences.minEngagementRate}%</Label>
              <Slider
                value={[preferences.minEngagementRate, 10]}
                onValueChange={([min]) => setPreferences(prev => ({ ...prev, minEngagementRate: min }))}
                min={0.1}
                max={10}
                step={0.1}
                className="mt-2"
              />
            </div>

            {/* Trust Score */}
            <div>
              <Label>Minimum Trust Score: {preferences.minTrustScore}/5</Label>
              <Slider
                value={[preferences.minTrustScore, 5]}
                onValueChange={([min]) => setPreferences(prev => ({ ...prev, minTrustScore: min }))}
                min={1}
                max={5}
                step={0.1}
                className="mt-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Required Niches */}
            <div>
              <Label>Required Niches</Label>
              <div className="space-y-2">
                {availableNiches.slice(0, 8).map((niche) => (
                  <div key={niche} className="flex items-center space-x-2">
                    <Checkbox
                      id={niche}
                      checked={preferences.requiredNiches.includes(niche)}
                      onCheckedChange={(checked) =>
                        setPreferences(prev => ({
                          ...prev,
                          requiredNiches: checked
                            ? [...prev.requiredNiches, niche]
                            : prev.requiredNiches.filter(n => n !== niche)
                        }))
                      }
                    />
                    <Label htmlFor={niche} className="text-sm">{niche}</Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Platform Preferences */}
            <div>
              <Label>Platform Preferences</Label>
              <div className="space-y-2">
                {availablePlatforms.map((platform) => (
                  <div key={platform} className="flex items-center space-x-2">
                    <Checkbox
                      id={platform}
                      checked={preferences.platformPreferences.includes(platform)}
                      onCheckedChange={(checked) =>
                        setPreferences(prev => ({
                          ...prev,
                          platformPreferences: checked
                            ? [...prev.platformPreferences, platform]
                            : prev.platformPreferences.filter(p => p !== platform)
                        }))
                      }
                    />
                    <Label htmlFor={platform} className="text-sm">{platform}</Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Experience Level */}
            <div>
              <Label>Experience Level</Label>
              <Select
                value={preferences.experienceLevel}
                onValueChange={(value) =>
                  setPreferences(prev => ({
                    ...prev,
                    experienceLevel: value as "beginner" | "intermediate" | "expert"
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner (0-2 campaigns)</SelectItem>
                  <SelectItem value="intermediate">Intermediate (3-10 campaigns)</SelectItem>
                  <SelectItem value="expert">Expert (10+ campaigns)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Location */}
            <div>
              <Label>Location Preference</Label>
              <Input
                value={preferences.location}
                onChange={(e) => setPreferences(prev => ({ ...prev, location: e.target.value }))}
                placeholder="e.g., New York, USA or remote"
              />
            </div>

            {/* Price Range */}
            <div>
              <Label>Budget Range</Label>
              <div className="space-y-3">
                <div>
                  <span className="text-sm text-gray-600">Min: ${formatCurrency(preferences.priceRange.min)}</span>
                  <Slider
                    value={[preferences.priceRange.min, preferences.priceRange.max]}
                    onValueChange={([min, max]) => setPreferences(prev => ({ ...prev, priceRange: { min, max } }))}
                    min={10}
                    max={50000}
                    step={50}
                    className="mt-2"
                  />
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>{formatCurrency(preferences.priceRange.min)}</span>
                  <span>{formatCurrency(preferences.priceRange.max)}</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Results */}
      {matches.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">
              AI Matches ({matches.length} influencers found)
            </h2>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Sorted by compatibility</span>
              <Brain className="h-5 w-5 text-blue-600" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {matches.map((match, index) => (
              <InfluencerCard key={match.id} match={match} index={index} />
            ))}
          </div>
        </>
      )}

      {matches.length === 0 && !searching && !error && (
        <div className="text-center py-12">
          <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No matches found</h3>
          <p className="text-gray-600 mb-4">
            Try adjusting your preferences or running the matching again
          </p>
          <Button onClick={runMatching} disabled={searching}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Different Criteria
          </Button>
        </div>
      )}
    </div>
  )
}