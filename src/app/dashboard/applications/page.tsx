"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import {
  FileText,
  User,
  Calendar,
  DollarSign,
  MessageSquare,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Search
} from "lucide-react"

interface Application {
  id: string
  proposedRate?: number
  proposalText: string
  status: string
  submittedAt: string
  reviewedAt?: string
  campaign: {
    id: string
    title: string
    brand?: {
      companyName: string
      logo?: string
    }
  }
  influencer?: {
    id: string
    firstName: string
    lastName: string
    profileImage?: string
  }
}

export default function ApplicationsPage() {
  const { data: session } = useSession()
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [searchTerm, setSearchTerm] = useState("")

  const isBrand = session?.user?.role === "BRAND"

  useEffect(() => {
    fetchApplications()
  }, [session, statusFilter, searchTerm])

  const fetchApplications = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        ...(statusFilter && { status: statusFilter }),
        ...(searchTerm && { search: searchTerm })
      })

      const endpoint = isBrand ? "/api/brands/applications" : "/api/influencers/applications"
      const response = await fetch(`${endpoint}?${params}`)

      if (!response.ok) throw new Error("Failed to fetch applications")

      const data = await response.json()
      setApplications(data.applications || data)
    } catch (error) {
      setError("Failed to load applications")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SUBMITTED": return "bg-blue-100 text-blue-800"
      case "UNDER_REVIEW": return "bg-yellow-100 text-yellow-800"
      case "SHORTLISTED": return "bg-purple-100 text-purple-800"
      case "HIRED": return "bg-green-100 text-green-800"
      case "REJECTED": return "bg-red-100 text-red-800"
      case "WITHDRAWN": return "bg-gray-100 text-gray-800"
      default: return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusLabel = (status: string) => {
    return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, l => l.toUpperCase())
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "HIRED": return <CheckCircle className="h-4 w-4" />
      case "REJECTED": return <XCircle className="h-4 w-4" />
      case "UNDER_REVIEW": return <Clock className="h-4 w-4" />
      default: return <FileText className="h-4 w-4" />
    }
  }

  const statuses = isBrand
    ? ["SUBMITTED", "UNDER_REVIEW", "SHORTLISTED", "HIRED", "REJECTED"]
    : ["SUBMITTED", "UNDER_REVIEW", "SHORTLISTED", "HIRED", "REJECTED", "WITHDRAWN"]

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Applications</h1>
            <p className="text-gray-600">
              {isBrand ? "Manage campaign applications" : "Track your application status"}
            </p>
          </div>
        </div>
        <div className="grid gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                    <div className="h-6 bg-gray-200 rounded w-20"></div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                  <div className="flex items-center justify-between">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                  </div>
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
          <h1 className="text-3xl font-bold">Applications</h1>
          <p className="text-gray-600">
            {isBrand ? "Manage campaign applications" : "Track your application status"}
            {applications.length > 0 && ` • ${applications.length} application${applications.length !== 1 ? 's' : ''}`}
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={`Search ${isBrand ? "influencers" : "campaigns"}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                {statuses.map(status => (
                  <SelectItem key={status} value={status}>{getStatusLabel(status)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Applications List */}
      {error ? (
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-red-600">{error}</p>
            <Button onClick={fetchApplications} className="mt-2">
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : applications.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No applications found</h3>
            <p className="text-gray-600">
              {isBrand
                ? "No applications match your criteria."
                : "You haven't applied to any campaigns yet."
              }
            </p>
            {!isBrand && (
              <Link href="/dashboard/campaigns">
                <Button className="mt-4">
                  Browse Campaigns
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {applications.map((application) => (
            <Card key={application.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    {/* Person/Brand Info */}
                    {isBrand ? (
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={application.influencer?.profileImage} />
                        <AvatarFallback>
                          {application.influencer?.firstName?.charAt(0)}
                          {application.influencer?.lastName?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center">
                        <FileText className="h-6 w-6 text-gray-400" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h3 className="font-semibold truncate">
                          {isBrand
                            ? `${application.influencer?.firstName} ${application.influencer?.lastName}`
                            : application.campaign.title
                          }
                        </h3>
                        <Badge className={getStatusColor(application.status)} variant="secondary">
                          <div className="flex items-center space-x-1">
                            {getStatusIcon(application.status)}
                            <span>{getStatusLabel(application.status)}</span>
                          </div>
                        </Badge>
                      </div>

                      <p className="text-sm text-gray-600 mb-2">
                        {isBrand
                          ? application.campaign.title
                          : `Applied to ${application.campaign.brand?.companyName}`
                        }
                      </p>

                      <p className="text-sm text-gray-700 line-clamp-2 mb-3">
                        {application.proposalText}
                      </p>

                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>Applied {formatDate(application.submittedAt)}</span>
                        </div>

                        {application.proposedRate && (
                          <div className="flex items-center space-x-1">
                            <DollarSign className="h-4 w-4" />
                            <span>${application.proposedRate.toLocaleString()}</span>
                          </div>
                        )}

                        {application.reviewedAt && (
                          <div className="flex items-center space-x-1">
                            <Clock className="h-4 w-4" />
                            <span>Reviewed {formatDate(application.reviewedAt)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 ml-4">
                    <Link href={`/dashboard/applications/${application.id}`}>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </Link>

                    {isBrand && application.status === "SUBMITTED" && (
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600">
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </div>
                    )}

                    <Button variant="outline" size="sm">
                      <MessageSquare className="h-4 w-4" />
                    </Button>
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