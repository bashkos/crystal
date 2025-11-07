import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { z } from "zod"
import { AdvancedAnalyticsEngine } from "@/lib/analytics/advanced-analytics"

const createDashboardSchema = z.object({
  name: z.string().min(1, "Dashboard name is required"),
  description: z.string(),
  isPublic: z.boolean().default(false),
  layout: z.object({
    type: z.enum(["grid", "flex", "custom"]).default("grid"),
    columns: z.number().min(1).max(12).default(4),
    gap: z.number().default(4),
    padding: z.number().default(4)
  }),
  filters: z.array(z.object({
    field: z.string(),
    operator: z.enum(["equals", "contains", "greater_than", "less_than", "between", "in"]),
    value: z.any(),
    label: z.string(),
    type: z.enum(["text", "number", "date", "select"]),
    options: z.array(z.string()).optional()
  })).default([]),
  widgets: z.array(z.object({
    type: z.enum(["metric", "chart", "table", "funnel", "gauge", "progress"]),
    title: z.string().min(1),
    description: z.string().optional(),
    position: z.object({
      x: z.number().min(0),
      y: z.number().min(0),
      width: z.number().min(1),
      height: z.number().min(1)
    }),
    config: z.object({
      metric: z.string().optional(),
      metrics: z.array(z.string()).optional(),
      chartType: z.enum(["line", "bar", "pie", "area", "scatter", "heatmap"]).optional(),
      timeRange: z.object({
        type: z.enum(["relative", "absolute"]).default("relative"),
        value: z.string().default("7d"),
        start: z.string().optional(),
        end: z.string().optional()
      }).optional(),
      granularity: z.enum(["hour", "day", "week", "month"]).optional(),
      aggregation: z.enum(["sum", "avg", "count", "min", "max"]).optional(),
      groupBy: z.array(z.string()).optional(),
      filters: z.array(z.any()).optional(),
      comparison: z.object({
        enabled: z.boolean().default(false),
        type: z.enum(["previous_period", "previous_year", "custom"]).optional(),
        value: z.string().optional()
      }).optional(),
      visualization: z.object({
        colors: z.array(z.string()).optional(),
        showLabels: z.boolean().default(true),
        showLegend: z.boolean().default(true),
        showGrid: z.boolean().default(true),
        stacked: z.boolean().default(false),
        normalized: z.boolean().default(false)
      }).optional()
    }),
    dataSource: z.object({
      type: z.enum(["campaigns", "influencers", "content", "revenue", "custom"]),
      query: z.string().optional(),
      table: z.string().optional(),
      join: z.array(z.any()).optional()
    }),
    refreshInterval: z.number().optional()
  })).min(1, "Dashboard must have at least one widget"),
  refreshInterval: z.number().default(300) // 5 minutes default
})

const createReportSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  type: z.enum(["campaign", "influencer", "content", "revenue", "custom"]),
  filters: z.array(z.any()).default([]),
  metrics: z.array(z.string()).min(1),
  timeRange: z.object({
    type: z.enum(["relative", "absolute"]).default("relative"),
    value: z.string().default("30d"),
    start: z.string().optional(),
    end: z.string().optional()
  }),
  format: z.enum(["pdf", "excel", "csv", "json"]),
  schedule: z.object({
    enabled: z.boolean().default(false),
    frequency: z.enum(["daily", "weekly", "monthly"]).optional(),
    recipients: z.array(z.string()).optional(),
    time: z.string().optional()
  }).optional()
})

const analyticsEngine = new AdvancedAnalyticsEngine()

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user?.role === "UNVERIFIED") {
      return NextResponse.json(
        { message: "Access denied. Please login and verify your account" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const endpoint = searchParams.get("endpoint")
    const dashboardId = searchParams.get("dashboardId")
    const reportId = searchParams.get("reportId")
    const insightsType = searchParams.get("type")
    const timeHorizon = searchParams.get("timeHorizon")

    if (endpoint === "dashboards") {
      // Get user's dashboards
      const dashboards = await analyticsEngine.getUserDashboards(session.user.id)
      return NextResponse.json({
        success: true,
        dashboards
      })
    }

    if (endpoint === "dashboard" && dashboardId) {
      // Get specific dashboard
      const dashboard = await analyticsEngine.getDashboard(dashboardId)

      // Verify access
      if (dashboard && dashboard.userId !== session.user.id && !dashboard.isPublic && session.user.role !== "ADMIN") {
        return NextResponse.json(
          { message: "Access denied" },
          { status: 403 }
        )
      }

      return NextResponse.json({
        success: true,
        dashboard
      })
    }

    if (endpoint === "dashboardData" && dashboardId) {
      // Generate dashboard data
      const dashboard = await analyticsEngine.getDashboard(dashboardId)

      if (!dashboard) {
        return NextResponse.json(
          { message: "Dashboard not found" },
          { status: 404 }
        )
      }

      // Verify access
      if (dashboard.userId !== session.user.id && !dashboard.isPublic && session.user.role !== "ADMIN") {
        return NextResponse.json(
          { message: "Access denied" },
          { status: 403 }
        )
      }

      // Get dynamic filters from query params
      const dynamicFilters: Record<string, any> = {}
      searchParams.forEach((value, key) => {
        if (key.startsWith("filter_")) {
          const filterKey = key.replace("filter_", "")
          dynamicFilters[filterKey] = value
        }
      })

      const dashboardData = await analyticsEngine.generateDashboardData(dashboardId, dynamicFilters)
      return NextResponse.json({
        success: true,
        data: dashboardData
      })
    }

    if (endpoint === "reports") {
      // Get user's reports
      const reports = await analyticsEngine.getUserReports(session.user.id)
      return NextResponse.json({
        success: true,
        reports
      })
    }

    if (endpoint === "report" && reportId) {
      // Get specific report
      const report = await analyticsEngine.getReport(reportId)

      // Verify access
      if (report && report.userId !== session.user.id && session.user.role !== "ADMIN") {
        return NextResponse.json(
          { message: "Access denied" },
          { status: 403 }
        )
      }

      return NextResponse.json({
        success: true,
        report
      })
    }

    if (endpoint === "metrics") {
      // Get available metrics
      const metrics = analyticsEngine.getAvailableMetrics()
      return NextResponse.json({
        success: true,
        metrics
      })
    }

    if (endpoint === "insights") {
      // Get predictive insights
      const insights = await analyticsEngine.getPredictiveInsights(
        session.user.id,
        insightsType as any,
        timeHorizon || "30d"
      )
      return NextResponse.json({
        success: true,
        insights
      })
    }

    if (endpoint === "templates") {
      // Get dashboard templates
      const templates = await analyticsEngine.getDashboardTemplates()
      return NextResponse.json({
        success: true,
        templates
      })
    }

    return NextResponse.json(
      { message: "Invalid endpoint" },
      { status: 400 }
    )
  } catch (error) {
    console.error("Error in advanced analytics API:", error)
    return NextResponse.json(
      { message: "Failed to fetch analytics data" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user?.role === "UNVERIFIED") {
      return NextResponse.json(
        { message: "Access denied. Please login and verify your account" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action } = body

    if (action === "createDashboard") {
      // Create custom dashboard
      const dashboardData = createDashboardSchema.parse(body)

      const dashboard = await analyticsEngine.createCustomDashboard(
        session.user.id,
        {
          ...dashboardData,
          userId: session.user.id,
          filters: dashboardData.filters.map((filter: any, index: number) => ({
            ...filter,
            id: `filter-${Date.now()}-${index}`
          })),
          widgets: dashboardData.widgets.map((widget: any, index: number) => ({
            ...widget,
            id: `widget-${Date.now()}-${index}`,
            config: widget.config ? {
              ...widget.config,
              comparison: widget.config.comparison && widget.config.comparison.enabled ? {
                enabled: true,
                type: widget.config.comparison.type || 'previous_period',
                value: widget.config.comparison.value
              } : undefined
            } : undefined
          }))
        } as any
      )

      return NextResponse.json({
        success: true,
        dashboard,
        message: "Dashboard created successfully"
      })
    } else if (action === "createReport") {
      // Create analytics report
      const reportData = createReportSchema.parse(body)

      const report = await analyticsEngine.createAnalyticsReport(
        session.user.id,
        {
          ...reportData,
          userId: session.user.id
        } as any
      )

      return NextResponse.json({
        success: true,
        report,
        message: "Report created successfully"
      })
    } else if (action === "generateReport") {
      // Generate report data
      const { reportId, customFilters } = body

      if (!reportId) {
        return NextResponse.json(
          { message: "Report ID is required" },
          { status: 400 }
        )
      }

      // Verify access
      const report = await analyticsEngine.getReport(reportId)
      if (report && report.userId !== session.user.id && session.user.role !== "ADMIN") {
        return NextResponse.json(
          { message: "Access denied" },
          { status: 403 }
        )
      }

      const generatedReport = await analyticsEngine.generateReport(reportId)

      return NextResponse.json({
        success: true,
        report: generatedReport,
        message: "Report generated successfully"
      })
    } else if (action === "duplicateDashboard") {
      // Duplicate existing dashboard
      const { dashboardId, name } = body

      if (!dashboardId) {
        return NextResponse.json(
          { message: "Dashboard ID is required" },
          { status: 400 }
        )
      }

      // Verify access to source dashboard
      const sourceDashboard = await analyticsEngine.getDashboard(dashboardId)
      if (sourceDashboard && sourceDashboard.userId !== session.user.id && !sourceDashboard.isPublic) {
        return NextResponse.json(
          { message: "Access denied" },
          { status: 403 }
        )
      }

      const duplicatedDashboard = await analyticsEngine.duplicateDashboard(
        dashboardId,
        session.user.id,
        name || `${sourceDashboard?.name} (Copy)`
      )

      return NextResponse.json({
        success: true,
        dashboard: duplicatedDashboard,
        message: "Dashboard duplicated successfully"
      })
    } else {
      return NextResponse.json(
        { message: "Invalid action" },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error("Error in advanced analytics POST:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation error", errors: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { message: "Failed to process analytics request" },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user?.role === "UNVERIFIED") {
      return NextResponse.json(
        { message: "Access denied. Please login and verify your account" },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action, dashboardId, reportId } = body

    if (action === "updateDashboard" && dashboardId) {
      // Update dashboard
      const dashboard = await analyticsEngine.getDashboard(dashboardId)

      if (!dashboard) {
        return NextResponse.json(
          { message: "Dashboard not found" },
          { status: 404 }
        )
      }

      // Verify access
      if (dashboard.userId !== session.user.id && session.user.role !== "ADMIN") {
        return NextResponse.json(
          { message: "Access denied" },
          { status: 403 }
        )
      }

      const updates = createDashboardSchema.partial().parse(body)
      const updatedDashboard = await analyticsEngine.updateDashboard(dashboardId, updates)

      return NextResponse.json({
        success: true,
        dashboard: updatedDashboard,
        message: "Dashboard updated successfully"
      })
    } else if (action === "updateReport" && reportId) {
      // Update report
      const report = await analyticsEngine.getReport(reportId)

      if (!report) {
        return NextResponse.json(
          { message: "Report not found" },
          { status: 404 }
        )
      }

      // Verify access
      if (report.userId !== session.user.id && session.user.role !== "ADMIN") {
        return NextResponse.json(
          { message: "Access denied" },
          { status: 403 }
        )
      }

      const updates = createReportSchema.partial().parse(body)
      const updatedReport = await analyticsEngine.updateReport(reportId, updates)

      return NextResponse.json({
        success: true,
        report: updatedReport,
        message: "Report updated successfully"
      })
    } else {
      return NextResponse.json(
        { message: "Invalid action" },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error("Error in advanced analytics PUT:", error)
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation error", errors: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { message: "Failed to update analytics data" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user?.role === "UNVERIFIED") {
      return NextResponse.json(
        { message: "Access denied. Please login and verify your account" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const dashboardId = searchParams.get("dashboardId")
    const reportId = searchParams.get("reportId")

    if (dashboardId) {
      // Delete dashboard
      const dashboard = await analyticsEngine.getDashboard(dashboardId)

      if (!dashboard) {
        return NextResponse.json(
          { message: "Dashboard not found" },
          { status: 404 }
        )
      }

      // Verify access
      if (dashboard.userId !== session.user.id && session.user.role !== "ADMIN") {
        return NextResponse.json(
          { message: "Access denied" },
          { status: 403 }
        )
      }

      await analyticsEngine.deleteDashboard(dashboardId)

      return NextResponse.json({
        success: true,
        message: "Dashboard deleted successfully"
      })
    } else if (reportId) {
      // Delete report
      const report = await analyticsEngine.getReport(reportId)

      if (!report) {
        return NextResponse.json(
          { message: "Report not found" },
          { status: 404 }
        )
      }

      // Verify access
      if (report.userId !== session.user.id && session.user.role !== "ADMIN") {
        return NextResponse.json(
          { message: "Access denied" },
          { status: 403 }
        )
      }

      await analyticsEngine.deleteReport(reportId)

      return NextResponse.json({
        success: true,
        message: "Report deleted successfully"
      })
    } else {
      return NextResponse.json(
        { message: "Dashboard ID or Report ID is required" },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error("Error in advanced analytics DELETE:", error)
    return NextResponse.json(
      { message: "Failed to delete analytics resource" },
      { status: 500 }
    )
  }
}

// Extend the AdvancedAnalyticsEngine class with additional methods
declare module "@/lib/analytics/advanced-analytics" {
  interface AdvancedAnalyticsEngine {
    getUserDashboards(userId: string): Promise<any[]>
    getUserReports(userId: string): Promise<any[]>
    getAvailableMetrics(): AnalyticsMetric[]
    getDashboardTemplates(): Promise<any[]>
    duplicateDashboard(dashboardId: string, userId: string, name: string): Promise<any>
    updateDashboard(dashboardId: string, updates: any): Promise<any>
    updateReport(reportId: string, updates: any): Promise<any>
    deleteDashboard(dashboardId: string): Promise<void>
    deleteReport(reportId: string): Promise<void>
  }
}

AdvancedAnalyticsEngine.prototype.getUserDashboards = async function(userId: string): Promise<any[]> {
  // Mock implementation - query database for user's dashboards
  return [
    {
      id: 'dashboard-1',
      name: 'Campaign Performance',
      description: 'Overview of campaign metrics',
      isPublic: false,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      widgetCount: 6
    }
  ]
}

AdvancedAnalyticsEngine.prototype.getUserReports = async function(userId: string): Promise<any[]> {
  // Mock implementation - query database for user's reports
  return [
    {
      id: 'report-1',
      name: 'Monthly Performance Report',
      description: 'Comprehensive monthly performance analysis',
      type: 'campaign',
      format: 'pdf',
      createdAt: new Date().toISOString(),
      lastGenerated: new Date().toISOString()
    }
  ]
}

AdvancedAnalyticsEngine.prototype.getAvailableMetrics = function(): AnalyticsMetric[] {
  return this.AVAILABLE_METRICS
}

AdvancedAnalyticsEngine.prototype.getDashboardTemplates = async function(): Promise<any[]> {
  // Mock implementation - return dashboard templates
  return [
    {
      id: 'template-campaign',
      name: 'Campaign Overview',
      description: 'Standard campaign performance dashboard',
      category: 'campaign',
      widgets: [
        {
          type: 'metric',
          title: 'Total Revenue',
          position: { x: 0, y: 0, width: 3, height: 2 },
          config: { metric: 'revenue', chartType: 'line' }
        }
      ]
    }
  ]
}

AdvancedAnalyticsEngine.prototype.duplicateDashboard = async function(
  dashboardId: string,
  userId: string,
  name: string
): Promise<any> {
  // Mock implementation - duplicate dashboard with new user
  return {
    id: `dashboard-duplicate-${Date.now()}`,
    name,
    userId,
    createdAt: new Date().toISOString()
  }
}

AdvancedAnalyticsEngine.prototype.updateDashboard = async function(dashboardId: string, updates: any): Promise<any> {
  // Mock implementation - update dashboard
  return { id: dashboardId, ...updates, updatedAt: new Date().toISOString() }
}

AdvancedAnalyticsEngine.prototype.updateReport = async function(reportId: string, updates: any): Promise<any> {
  // Mock implementation - update report
  return { id: reportId, ...updates }
}

AdvancedAnalyticsEngine.prototype.deleteDashboard = async function(dashboardId: string): Promise<void> {
  // Mock implementation - delete dashboard
  console.log('Deleting dashboard:', dashboardId)
}

AdvancedAnalyticsEngine.prototype.deleteReport = async function(reportId: string): Promise<void> {
  // Mock implementation - delete report
  console.log('Deleting report:', reportId)
}