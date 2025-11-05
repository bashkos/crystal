"use client"

import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Briefcase,
  Users,
  TrendingUp,
  DollarSign,
  ArrowRight,
  Plus,
  Search,
  FileText,
  Settings
} from "lucide-react"
import Link from "next/link"

export default function DashboardPage() {
  const { data: session } = useSession()
  const isBrand = session?.user?.role === "BRAND"

  if (isBrand) {
    return (
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {session?.user?.name}!
          </h1>
          <p className="text-blue-100">
            Ready to launch your next influencer campaign?
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">3</div>
              <p className="text-xs text-muted-foreground">+1 from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">24</div>
              <p className="text-xs text-muted-foreground">+12 from last week</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Engagement</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">4.2%</div>
              <p className="text-xs text-muted-foreground">+0.5% from last month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$12,450</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Create New Campaign</CardTitle>
              <CardDescription>
                Launch a new influencer campaign in minutes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/campaigns/new">
                <Button className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Campaign
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Find Influencers</CardTitle>
              <CardDescription>
                Discover influencers that match your brand
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/influencers">
                <Button variant="outline" className="w-full">
                  <Search className="h-4 w-4 mr-2" />
                  Browse Influencers
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest updates from your campaigns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Summer Collection Campaign</p>
                  <p className="text-sm text-gray-600">5 new applications received</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Product Launch Campaign</p>
                  <p className="text-sm text-gray-600">Influencer content approved</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Influencer Dashboard
  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, {session?.user?.name}!
        </h1>
        <p className="text-purple-100">
          Discover your next brand collaboration
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Applications</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5.8%</div>
            <p className="text-xs text-muted-foreground">Above average</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$3,200</div>
            <p className="text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Browse Campaigns</CardTitle>
            <CardDescription>
              Find new collaboration opportunities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/campaigns">
              <Button className="w-full">
                <Search className="h-4 w-4 mr-2" />
                Find Campaigns
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Update Profile</CardTitle>
            <CardDescription>
              Keep your portfolio and rates up to date
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/settings">
              <Button variant="outline" className="w-full">
                <Settings className="h-4 w-4 mr-2" />
                Edit Profile
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recommended Campaigns */}
      <Card>
        <CardHeader>
          <CardTitle>Recommended Campaigns</CardTitle>
          <CardDescription>
            Campaigns matching your profile and interests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">Fashion Brand Collaboration</p>
                <p className="text-sm text-gray-600">Instagram posts & Stories • $500-800</p>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">Beauty Product Launch</p>
                <p className="text-sm text-gray-600">TikTok videos • $300-500</p>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}