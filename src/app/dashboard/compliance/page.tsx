"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Eye,
  Download,
  Filter,
  Search,
  Plus,
  Settings,
  FileText,
  Users,
  BarChart3
} from "lucide-react"

interface ComplianceCheck {
  id: string
  contentId: string
  contentType: 'image' | 'video' | 'text' | 'story'
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FLAGGED'
  score: number
  violations: any[]
  influencerName: string
  campaignName: string
  checkedAt: string
  checkedBy: 'AI' | 'HUMAN'
}

interface ComplianceRule {
  id: string
  name: string
  type: string
  isActive: boolean
  severity: string
  autoReject: boolean
}

export default function ComplianceDashboard() {
  const { data: session } = useSession()
  const [checks, setChecks] = useState<ComplianceCheck[]>([])
  const [rules, setRules] = useState<ComplianceRule[]>([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({
    totalChecks: 0,
    approvalRate: 0,
    averageScore: 0,
    flaggedItems: 0
  })
  const [filters, setFilters] = useState({
    status: "all",
    contentType: "all",
    timeframe: "week"
  })
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    if (session?.user?.id) {
      fetchComplianceData()
    }
  }, [session?.user?.id, filters])

  const fetchComplianceData = async () => {
    try {
      setLoading(true)

      // Mock API calls - in real app, these would be actual API requests
      const mockChecks: ComplianceCheck[] = [
        {
          id: "check-1",
          contentId: "content-1",
          contentType: "image",
          status: "APPROVED",
          score: 95,
          violations: [],
          influencerName: "Sarah Johnson",
          campaignName: "Summer Collection Launch",
          checkedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
          checkedBy: "AI"
        },
        {
          id: "check-2",
          contentId: "content-2",
          contentType: "video",
          status: "FLAGGED",
          score: 75,
          violations: [
            { category: "BRAND", description: "Missing required hashtag" }
          ],
          influencerName: "Mike Chen",
          campaignName: "Tech Product Review",
          checkedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
          checkedBy: "AI"
        },
        {
          id: "check-3",
          contentId: "content-3",
          contentType: "text",
          status: "REJECTED",
          score: 45,
          violations: [
            { category: "LEGAL", description: "Missing disclosure" },
            { category: "CONTENT", description: "Inappropriate language" }
          ],
          influencerName: "Emily Davis",
          campaignName: "Fashion Week Coverage",
          checkedAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
          checkedBy: "AI"
        }
      ]

      const mockRules: ComplianceRule[] = [
        {
          id: "rule-1",
          name: "Prohibited Content",
          type: "PROHIBITED_CONTENT",
          isActive: true,
          severity: "CRITICAL",
          autoReject: true
        },
        {
          id: "rule-2",
          name: "Brand Safety",
          type: "BRAND_GUIDELINES",
          isActive: true,
          severity: "MEDIUM",
          autoReject: false
        },
        {
          id: "rule-3",
          name: "Legal Requirements",
          type: "LEGAL_REQUIREMENTS",
          isActive: true,
          severity: "HIGH",
          autoReject: false
        }
      ]

      setChecks(mockChecks)
      setRules(mockRules)

      // Calculate stats
      const approvedCount = mockChecks.filter(c => c.status === "APPROVED").length
      const flaggedCount = mockChecks.filter(c => c.status === "FLAGGED").length
      const avgScore = mockChecks.reduce((sum, c) => sum + c.score, 0) / mockChecks.length

      setStats({
        totalChecks: mockChecks.length,
        approvalRate: (approvedCount / mockChecks.length) * 100,
        averageScore: Math.round(avgScore),
        flaggedItems: flaggedCount
      })
    } catch (error) {
      console.error("Error fetching compliance data:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "APPROVED":
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case "REJECTED":
        return <XCircle className="h-4 w-4 text-red-600" />
      case "FLAGGED":
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case "PENDING":
        return <Clock className="h-4 w-4 text-blue-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-green-100 text-green-800"
      case "REJECTED":
        return "bg-red-100 text-red-800"
      case "FLAGGED":
        return "bg-yellow-100 text-yellow-800"
      case "PENDING":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600"
    if (score >= 70) return "text-yellow-600"
    return "text-red-600"
  }

  const filteredChecks = checks.filter(check => {
    if (filters.status !== "all" && check.status !== filters.status) return false
    if (filters.contentType !== "all" && check.contentType !== filters.contentType) return false
    if (searchTerm) {
      return check.influencerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
             check.campaignName.toLowerCase().includes(searchTerm.toLowerCase())
    }
    return true
  })

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Compliance Management</h1>
          <p className="text-gray-600">Monitor and manage content compliance</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Rule
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Checks</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalChecks}</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.approvalRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              +2.1% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getScoreColor(stats.averageScore)}`}>
              {stats.averageScore}
            </div>
            <p className="text-xs text-muted-foreground">
              Out of 100
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flagged Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.flaggedItems}</div>
            <p className="text-xs text-muted-foreground">
              Need review
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="checks" className="space-y-6">
        <TabsList>
          <TabsTrigger value="checks">Compliance Checks</TabsTrigger>
          <TabsTrigger value="rules">Rules & Guidelines</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="checks">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Compliance Checks</CardTitle>
                  <CardDescription>
                    Review content compliance results and violations
                  </CardDescription>
                </div>
                <div className="flex items-center space-x-4">
                  <Input
                    placeholder="Search checks..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                  <Select value={filters.status} onValueChange={(value) =>
                    setFilters(prev => ({ ...prev, status: value }))
                  }>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                      <SelectItem value="FLAGGED">Flagged</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <Clock className="h-6 w-6 animate-spin mx-auto text-gray-400" />
                  <p className="mt-2 text-gray-500">Loading compliance checks...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredChecks.map((check) => (
                    <div key={check.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          {getStatusIcon(check.status)}
                          <div>
                            <h4 className="font-semibold">{check.influencerName}</h4>
                            <p className="text-sm text-gray-600">{check.campaignName}</p>
                            <p className="text-xs text-gray-500">
                              {check.contentType} • {new Date(check.checkedAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <div className={`font-semibold ${getScoreColor(check.score)}`}>
                              {check.score}/100
                            </div>
                            <Badge className={getStatusColor(check.status)}>
                              {check.status}
                            </Badge>
                          </div>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4 mr-2" />
                            Review
                          </Button>
                        </div>
                      </div>

                      {check.violations.length > 0 && (
                        <div className="mt-4 pt-4 border-t">
                          <h5 className="font-medium text-sm text-red-600 mb-2">Violations:</h5>
                          <div className="space-y-2">
                            {check.violations.map((violation, index) => (
                              <div key={index} className="flex items-center space-x-2 text-sm">
                                <XCircle className="h-3 w-3 text-red-500" />
                                <span className="text-gray-700">{violation.description}</span>
                                <Badge variant="outline" className="text-xs">
                                  {violation.category}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Active Rules</CardTitle>
                <CardDescription>
                  Manage content compliance rules and guidelines
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {rules.map((rule) => (
                    <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Switch checked={rule.isActive} />
                        <div>
                          <h4 className="font-medium">{rule.name}</h4>
                          <p className="text-sm text-gray-600">{rule.type}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={rule.severity === "CRITICAL" ? "destructive" : "outline"}>
                          {rule.severity}
                        </Badge>
                        {rule.autoReject && (
                          <Badge variant="secondary">Auto Reject</Badge>
                        )}
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Create New Rule</CardTitle>
                <CardDescription>
                  Define custom compliance rules for your brand
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="rule-name">Rule Name</Label>
                  <Input id="rule-name" placeholder="Enter rule name" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rule-type">Rule Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select rule type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prohibited">Prohibited Content</SelectItem>
                      <SelectItem value="required">Required Elements</SelectItem>
                      <SelectItem value="brand">Brand Guidelines</SelectItem>
                      <SelectItem value="legal">Legal Requirements</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rule-description">Description</Label>
                  <Textarea
                    id="rule-description"
                    placeholder="Describe what this rule checks for..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Severity</Label>
                    <Select defaultValue="medium">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Action</Label>
                    <Select defaultValue="flag">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="warn">Warning Only</SelectItem>
                        <SelectItem value="flag">Flag for Review</SelectItem>
                        <SelectItem value="reject">Auto Reject</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Rule
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Analytics</CardTitle>
              <CardDescription>
                Insights and trends in content compliance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Compliance analytics dashboard coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Compliance Settings</CardTitle>
              <CardDescription>
                Configure global compliance settings and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Auto-approval Threshold</h4>
                  <p className="text-sm text-gray-600">Minimum compliance score for automatic approval</p>
                </div>
                <Select defaultValue="90">
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="95">95</SelectItem>
                    <SelectItem value="90">90</SelectItem>
                    <SelectItem value="85">85</SelectItem>
                    <SelectItem value="80">80</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Human Review Required</h4>
                  <p className="text-sm text-gray-600">Manually review all flagged content</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Notification Settings</h4>
                  <p className="text-sm text-gray-600">Send notifications for compliance events</p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Analytics Tracking</h4>
                  <p className="text-sm text-gray-600">Track compliance metrics and trends</p>
                </div>
                <Switch defaultChecked />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}