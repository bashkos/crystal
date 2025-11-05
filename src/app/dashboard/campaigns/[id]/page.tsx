"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  Users,
  MapPin,
  Globe,
  CheckCircle,
  Clock,
  Edit,
  Trash2,
  ExternalLink,
  Apply,
  MessageSquare,
  FileText
} from "lucide-react"

interface Campaign {
  id: string
  title: string
  description: string
  category: string
  contentType: string
  platform: string
  status: string
  visibility: string
  budgetMin?: number
  budgetMax?: number
  applicationDeadline?: string
  startDate?: string
  endDate?: string
  location?: string
  isRemote: boolean
  influencerCount?: number
  requirements: any
  deliverables: string[]
  createdAt: string
  updatedAt: string
  brand?: {
    id: string
    companyName: string
    logo?: string
    industry: string
    website?: string
    companyDescription?: string
    verificationStatus: string
  }
  _count: {
    applications: number
  }
}

export default function CampaignDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [applying, setApplying] = useState(false)

  const isBrand = session?.user?.role === "BRAND"
  const isInfluencer = session?.user?.role === "INFLUENCER"
  const campaignId = params.id as string

  useEffect(() => {
    if (campaignId) {
      fetchCampaign()
    }
  }, [campaignId, session])

  const fetchCampaign = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/campaigns/${campaignId}`)
      if (!response.ok) {
        if (response.status === 404) {
          setError("Campaign not found")
        } else {
          throw new Error("Failed to fetch campaign")
        }
        return
      }

      const data = await response.json()
      setCampaign(data)
    } catch (error) {
      console.error("Error fetching campaign:", error)
      setError("Failed to load campaign")
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async () => {
    if (!isInfluencer || !campaign) return

    setApplying(true)
    try {
      const response = await fetch(`/api/campaigns/${campaignId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proposalText: "I'm interested in this campaign and would love to collaborate!",
        }),
      })

      if (response.ok) {
        router.push(`/dashboard/applications`)
      } else {
        const data = await response.json()
        setError(data.message || "Failed to apply to campaign")
      }
    } catch (error) {
      setError("An error occurred while applying")
    } finally {
      setApplying(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OPEN": return "bg-green-100 text-green-800"
      case "DRAFT": return "bg-gray-100 text-gray-800"
      case "REVIEWING": return "bg-yellow-100 text-yellow-800"
      case "HIRING": return "bg-blue-100 text-blue-800"
      case "IN_PROGRESS": return "bg-purple-100 text-purple-800"
      case "COMPLETED": return "bg-emerald-100 text-emerald-800"
      case "CANCELLED": return "bg-red-100 text-red-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusLabel = (status: string) => {
    return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    })
  }

  const formatBudget = (min?: number, max?: number) => {
    if (!min && !max) return "Budget not specified"
    if (min === max) return `$${min?.toLocaleString()}`
    if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`
    if (min) return `From $${min.toLocaleString()}`
    if (max) return `Up to $${max.toLocaleString()}`
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error || !campaign) {
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
            <p className="text-red-600">{error || "Campaign not found"}</p>
            <Button onClick={() => router.back()} className="mt-4">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const canApply = isInfluencer &&
    campaign.status === "OPEN" &&
    campaign.visibility === "PUBLIC"

  const canEdit = isBrand &&
    (campaign.status === "DRAFT" || campaign.status === "OPEN")

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Campaigns
          </Button>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-3xl font-bold">{campaign.title}</h1>
              <Badge className={getStatusColor(campaign.status)}>
                {getStatusLabel(campaign.status)}
              </Badge>
            </div>
            <p className="text-gray-600 mt-1">
              Posted {formatDate(campaign.createdAt)}
            </p>
          </div>
        </div>

        {canEdit && (
          <div className="flex space-x-2">
            <Link href={`/dashboard/campaigns/${campaign.id}/edit`}>
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </Link>
          </div>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Campaign Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700 leading-relaxed">
                {campaign.description}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Budget:</span>
                    <span className="text-sm">{formatBudget(campaign.budgetMin, campaign.budgetMax)}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Influencers:</span>
                    <span className="text-sm">{campaign.influencerCount || 1}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Duration:</span>
                    <span className="text-sm">
                      {campaign.startDate && campaign.endDate
                        ? `${formatDate(campaign.startDate)} - ${formatDate(campaign.endDate)}`
                        : "Flexible dates"
                      }
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Content Type:</span>
                    <span className="text-sm">{campaign.contentType}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Globe className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Platform:</span>
                    <span className="text-sm">{campaign.platform}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Location:</span>
                    <span className="text-sm">{campaign.isRemote ? "Remote" : campaign.location || "On-site"}</span>
                  </div>
                </div>
              </div>

              {campaign.applicationDeadline && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-800">
                      Application Deadline: {formatDate(campaign.applicationDeadline)}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Requirements */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Requirements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {campaign.requirements?.targetAudience && (
                <div>
                  <h4 className="font-semibold mb-2">Target Audience</h4>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded">
                    {campaign.requirements.targetAudience}
                  </p>
                </div>
              )}

              {campaign.requirements?.contentGuidelines && (
                <div>
                  <h4 className="font-semibold mb-2">Content Guidelines</h4>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded">
                    {campaign.requirements.contentGuidelines}
                  </p>
                </div>
              )}

              {campaign.requirements?.technicalSpecs && (
                <div>
                  <h4 className="font-semibold mb-2">Technical Specifications</h4>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded">
                    {campaign.requirements.technicalSpecs}
                  </p>
                </div>
              )}

              {campaign.deliverables && campaign.deliverables.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Deliverables</h4>
                  <div className="flex flex-wrap gap-2">
                    {campaign.deliverables.map((deliverable, index) => (
                      <Badge key={index} variant="outline">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {deliverable}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Brand Info */}
          {campaign.brand && (
            <Card>
              <CardHeader>
                <CardTitle>Brand Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={campaign.brand.logo} />
                    <AvatarFallback>{campaign.brand.companyName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-semibold">{campaign.brand.companyName}</h3>
                    <p className="text-sm text-gray-600">{campaign.brand.industry}</p>
                    <Badge
                      className={campaign.brand.verificationStatus === "VERIFIED"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                      }
                    >
                      {campaign.brand.verificationStatus}
                    </Badge>
                  </div>
                </div>

                {campaign.brand.companyDescription && (
                  <p className="text-sm text-gray-700">
                    {campaign.brand.companyDescription}
                  </p>
                )}

                {campaign.brand.website && (
                  <a
                    href={campaign.brand.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Visit Website
                  </a>
                )}
              </CardContent>
            </Card>
          )}

          {/* Campaign Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Campaign Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Applications</span>
                <span className="font-semibold">{campaign._count.applications}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <Badge className={getStatusColor(campaign.status)}>
                  {getStatusLabel(campaign.status)}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Category</span>
                <Badge variant="outline">{campaign.category}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          {canApply && (
            <Card>
              <CardContent className="p-6">
                <Button
                  onClick={handleApply}
                  disabled={applying}
                  className="w-full"
                  size="lg"
                >
                  <Apply className="h-4 w-4 mr-2" />
                  {applying ? "Applying..." : "Apply to Campaign"}
                </Button>

                {isInfluencer && (
                  <Button variant="outline" className="w-full mt-2">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Contact Brand
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}