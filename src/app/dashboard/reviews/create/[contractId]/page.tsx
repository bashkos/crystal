"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Star,
  ArrowLeft,
  Save,
  MessageSquare,
  Clock,
  CheckCircle,
  ThumbsUp,
  ThumbsDown,
  Send
} from "lucide-react"

interface Contract {
  id: string
  totalAmount: number
  status: string
  completedAt?: string
  campaign: {
    title: string
    category: string
  }
  brand?: {
    companyName: string
    logo?: string
  }
  influencer?: {
    firstName: string
    lastName: string
    profileImage?: string
  }
}

export default function CreateReviewPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [contract, setContract] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const [formData, setFormData] = useState({
    ratingScores: {
      // Brand ratings for influencers
      contentQuality: 0,
      professionalism: 0,
      communication: 0,
      collaboration: 0,
      timeliness: 0,
      creativity: 0,
      adherence: 0,
      overallSatisfaction: 0,

      // Influencer ratings for brands
      clarity: 0,
      fairness: 0,
      communicationQuality: 0,
      promptness: 0,
      respect: 0,
      flexibility: 0,
      paymentTimeliness: 0,
      creativeFreedom: 0,
    },
    reviewText: "",
    recommendationScore: 8,
    isPublic: true,
    tags: [] as string[],
  })

  const contractId = params.contractId as string
  const isBrand = session?.user?.role === "BRAND"

  useEffect(() => {
    if (contractId && session) {
      fetchContract()
    }
  }, [contractId, session])

  const fetchContract = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/contracts/${contractId}`)
      if (!response.ok) {
        if (response.status === 404) {
          setError("Contract not found")
        } else {
          throw new Error("Failed to fetch contract")
        }
        return
      }

      const data = await response.json()
      setContract(data)

      // Check if contract is completed and user can review
      if (data.status !== "COMPLETED") {
        setError("You can only review completed contracts")
        return
      }

      if ((isBrand && data.brandId !== session.user.id) ||
          (!isBrand && data.influencerId !== session.user.id)) {
        setError("You can only review contracts you participated in")
        return
      }

    } catch (error) {
      console.error("Error fetching contract:", error)
      setError("Failed to load contract")
    } finally {
      setLoading(false)
    }
  }

  const handleRatingChange = (rating: string, value: number) => {
    setFormData(prev => ({
      ...prev,
      ratingScores: {
        ...prev.ratingScores,
        [rating]: value
      }
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError("")
    setSuccess("")

    try {
      // Validate required ratings based on user role
      const requiredRatings = isBrand ? [
        'contentQuality', 'professionalism', 'communication', 'collaboration',
        'timeliness', 'creativity', 'adherence', 'overallSatisfaction'
      ] : [
        'clarity', 'fairness', 'communicationQuality', 'promptness',
        'respect', 'flexibility', 'paymentTimeliness', 'creativeFreedom'
      ]

      const missingRatings = requiredRatings.filter(rating =>
        formData.ratingScores[rating as keyof typeof formData.ratingScores] === 0
      )

      if (missingRatings.length > 0) {
        setError("Please rate all required categories")
        return
      }

      if (formData.reviewText.length < 10) {
        setError("Review text must be at least 10 characters long")
        return
      }

      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractId,
          ratingScores: formData.ratingScores,
          reviewText: formData.reviewText,
          recommendationScore: formData.recommendationScore,
          isPublic: formData.isPublic,
          tags: formData.tags,
        }),
      })

      if (response.ok) {
        setSuccess("Review submitted successfully!")
        setTimeout(() => {
          router.push("/dashboard/reviews")
        }, 2000)
      } else {
        const data = await response.json()
        setError(data.message || "Failed to submit review")
      }
    } catch (error) {
      setError("An error occurred while submitting review")
    } finally {
      setSubmitting(false)
    }
  }

  const StarRating = ({ rating, value, onChange, label }: {
    rating: string
    value: number
    onChange: (value: number) => void
    label: string
  }) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="p-1 hover:scale-110 transition-transform"
          >
            <Star
              className={`h-5 w-5 ${
                star <= value
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300 hover:text-yellow-200"
              }`}
            />
          </button>
        ))}
        <span className="text-sm text-gray-500 ml-2">({value}/5)</span>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error && !contract) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-red-600">{error}</p>
            <Button onClick={() => router.back()} className="mt-4">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const brandRatings = [
    { rating: "contentQuality", label: "Content Quality" },
    { rating: "professionalism", label: "Professionalism" },
    { rating: "communication", label: "Communication" },
    { rating: "collaboration", label: "Collaboration" },
    { rating: "timeliness", label: "Timeliness" },
    { rating: "creativity", label: "Creativity" },
    { rating: "adherence", label: "Guideline Adherence" },
    { rating: "overallSatisfaction", label: "Overall Satisfaction" },
  ]

  const influencerRatings = [
    { rating: "clarity", label: "Brief Clarity" },
    { rating: "fairness", label: "Fairness" },
    { rating: "communicationQuality", label: "Communication Quality" },
    { rating: "promptness", label: "Response Promptness" },
    { rating: "respect", label: "Professional Respect" },
    { rating: "flexibility", label: "Flexibility" },
    { rating: "paymentTimeliness", label: "Payment Timeliness" },
    { rating: "creativeFreedom", label: "Creative Freedom" },
  ]

  const ratingsToUse = isBrand ? brandRatings : influencerRatings

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
            <h1 className="text-3xl font-bold">Leave a Review</h1>
            <p className="text-gray-600">
              Share your experience with this collaboration
            </p>
          </div>
        </div>
      </div>

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {contract && (
        <>
          {/* Contract Info */}
          <Card>
            <CardHeader>
              <CardTitle>Review Details</CardTitle>
              <CardDescription>
                You're reviewing your experience with this completed campaign
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4 mb-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage
                    src={isBrand ? contract.influencer?.profileImage : contract.brand?.logo}
                  />
                  <AvatarFallback>
                    {isBrand
                      ? `${contract.influencer?.firstName?.charAt(0)}${contract.influencer?.lastName?.charAt(0)}`
                      : contract.brand?.companyName?.charAt(0)
                    }
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">
                    {isBrand
                      ? `${contract.influencer?.firstName} ${contract.influencer?.lastName}`
                      : contract.brand?.companyName
                    }
                  </h3>
                  <p className="text-sm text-gray-600">{contract.campaign.title}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="outline">{contract.campaign.category}</Badge>
                    <span className="text-sm text-gray-500">
                      Completed {contract.completedAt ? new Date(contract.completedAt).toLocaleDateString() : 'Recently'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Review Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Ratings */}
            <Card>
              <CardHeader>
                <CardTitle>Rate Your Experience</CardTitle>
                <CardDescription>
                  Rate different aspects of the collaboration (1-5 stars)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {ratingsToUse.map(({ rating, label }) => (
                    <StarRating
                      key={rating}
                      rating={rating}
                      value={formData.ratingScores[rating as keyof typeof formData.ratingScores] as number}
                      onChange={(value) => handleRatingChange(rating, value)}
                      label={label}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recommendation Score */}
            <Card>
              <CardHeader>
                <CardTitle>Recommendation Score</CardTitle>
                <CardDescription>
                  How likely are you to recommend {isBrand ? "this influencer" : "this brand"}? (1-10)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <Input
                      type="number"
                      min="1"
                      max="10"
                      value={formData.recommendationScore}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        recommendationScore: parseInt(e.target.value)
                      }))}
                      className="w-20"
                    />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <ThumbsDown className="h-4 w-4 text-red-500" />
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-2 rounded-full"
                            style={{ width: `${(formData.recommendationScore / 10) * 100}%` }}
                          />
                        </div>
                        <ThumbsUp className="h-4 w-4 text-green-500" />
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Not likely</span>
                        <span>Very likely</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Review Text */}
            <Card>
              <CardHeader>
                <CardTitle>Written Review</CardTitle>
                <CardDescription>
                  Share more details about your experience (minimum 10 characters)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.reviewText}
                  onChange={(e) => setFormData(prev => ({ ...prev, reviewText: e.target.value }))}
                  placeholder="What went well? What could be improved? Would you work together again?"
                  rows={6}
                  className="resize-none"
                />
                <div className="text-sm text-gray-500 mt-1">
                  {formData.reviewText.length}/10 characters minimum
                </div>
              </CardContent>
            </Card>

            {/* Privacy Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Privacy Settings</CardTitle>
                <CardDescription>
                  Control who can see your review
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isPublic"
                    checked={formData.isPublic}
                    onCheckedChange={(checked) =>
                      setFormData(prev => ({ ...prev, isPublic: checked as boolean }))
                    }
                  />
                  <Label htmlFor="isPublic">
                    Make this review public (others can see it)
                  </Label>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Private reviews are only visible to platform administrators
                </p>
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="min-w-[120px]"
              >
                {submitting ? (
                  "Submitting..."
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Review
                  </>
                )}
              </Button>
            </div>
          </form>
        </>
      )}
    </div>
  )
}