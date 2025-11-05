"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Plus,
  Search,
  Filter,
  Calendar,
  DollarSign,
  Users,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight
} from "lucide-react"

interface Campaign {
  id: string
  title: string
  description: string
  category: string
  contentType: string
  platform: string
  status: string
  budgetMin?: number
  budgetMax?: number
  applicationDeadline?: string
  startDate?: string
  endDate?: string
  visibility: string
  influencerCount?: number
  brand?: {
    id: string
    companyName: string
    logo?: string
    industry: string
    website?: string
  }
  _count: {
    applications: number
  }
}

export default function CampaignsPage() {
  const { data: session } = useSession()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const isBrand = session?.user?.role === "BRAND"

  useEffect(() => {
    fetchCampaigns()
  }, [session, currentPage, searchTerm, statusFilter, categoryFilter])

  const fetchCampaigns = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "12",
        ...(statusFilter && { status: statusFilter }),
        ...(categoryFilter && { category: categoryFilter }),
        ...(searchTerm && { search: searchTerm })
      })

      const response = await fetch(`/api/campaigns?${params}`)
      if (!response.ok) throw new Error("Failed to fetch campaigns")

      const data = await response.json()
      setCampaigns(data.campaigns)
      setTotalPages(data.pagination.pages)
      setTotal(data.pagination.total)
    } catch (error) {
      setError("Failed to load campaigns")
      console.error(error)
    } finally {
      setLoading(false)
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return "No deadline"
    return new Date(dateString).toLocaleDateString()
  }

  const formatBudget = (min?: number, max?: number) => {
    if (!min && !max) return "Budget not specified"
    if (min === max) return `$${min?.toLocaleString()}`
    if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`
    if (min) return `From $${min.toLocaleString()}`
    if (max) return `Up to $${max.toLocaleString()}`
  }

  const categories = [
    "Fashion & Beauty", "Food & Beverage", "Technology", "Travel",
    "Fitness & Health", "Entertainment", "Education", "Automotive"
  ]

  const statuses = isBrand
    ? ["DRAFT", "OPEN", "REVIEWING", "HIRING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]
    : ["OPEN"]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Campaigns</h1>
            <p className="text-gray-600">
              {isBrand ? "Manage your campaigns" : "Browse available campaigns"}
            </p>
          </div>
          {isBrand && (
            <Link href="/dashboard/campaigns/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            </Link>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
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
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="text-gray-600">
            {isBrand ? "Manage your campaigns" : "Browse available campaigns"}
            {total > 0 && ` • ${total} campaign${total !== 1 ? 's' : ''}`}
          </p>
        </div>
        {isBrand && (
          <Link href="/dashboard/campaigns/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign
            </Button>
          </Link>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search campaigns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Statuses</SelectItem>
                  {statuses.map(status => (
                    <SelectItem key={status} value={status}>{getStatusLabel(status)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Campaigns Grid */}
      {error ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-red-600">{error}</p>
            <Button onClick={fetchCampaigns} className="mt-2">
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Filter className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No campaigns found</h3>
            <p className="text-gray-600 mb-6">
              {isBrand
                ? "Create your first campaign to start working with influencers."
                : "No campaigns match your filters. Try adjusting your search criteria."
              }
            </p>
            {isBrand && (
              <Link href="/dashboard/campaigns/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Campaign
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((campaign) => (
              <Card key={campaign.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg line-clamp-1">{campaign.title}</CardTitle>
                      <CardDescription className="mt-1">
                        by {isBrand ? "You" : campaign.brand?.companyName}
                      </CardDescription>
                    </div>
                    <Badge className={getStatusColor(campaign.status)}>
                      {getStatusLabel(campaign.status)}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Brand Info (for influencers) */}
                  {!isBrand && campaign.brand && (
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={campaign.brand.logo} />
                        <AvatarFallback>{campaign.brand.companyName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{campaign.brand.companyName}</p>
                        <p className="text-xs text-gray-500 truncate">{campaign.brand.industry}</p>
                      </div>
                    </div>
                  )}

                  {/* Campaign Details */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Category</span>
                      <Badge variant="outline">{campaign.category}</Badge>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Content Type</span>
                      <span className="font-medium">{campaign.contentType}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Platform</span>
                      <span className="font-medium">{campaign.platform}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Budget</span>
                      <span className="font-medium">{formatBudget(campaign.budgetMin, campaign.budgetMax)}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Applications</span>
                      <span className="font-medium">{campaign._count.applications}</span>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Deadline</span>
                      <span className="font-medium">{formatDate(campaign.applicationDeadline)}</span>
                    </div>
                  </div>

                  {/* Description Preview */}
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {campaign.description}
                  </p>

                  {/* Action Buttons */}
                  <div className="flex space-x-2">
                    <Link href={`/dashboard/campaigns/${campaign.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </Link>

                    {isBrand && campaign.status === "DRAFT" && (
                      <Link href={`/dashboard/campaigns/${campaign.id}/edit`}>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = i + 1
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </Button>
                  )
                })}
              </div>

              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}