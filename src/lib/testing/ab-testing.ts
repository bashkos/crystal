import { prisma } from "../db"

export interface ABTest {
  id: string
  campaignId: string
  name: string
  description: string
  status: 'DRAFT' | 'RUNNING' | 'COMPLETED' | 'PAUSED'
  startDate?: string
  endDate?: string
  targetAudience: {
    size: number
    demographics: Record<string, any>
    filters: Record<string, any>
  }
  variants: TestVariant[]
  primaryMetric: string
  secondaryMetrics: string[]
  significanceLevel: number
  minimumSampleSize: number
  results?: TestResult
  createdAt: string
  createdBy: string
}

export interface TestVariant {
  id: string
  name: string
  description: string
  type: 'CREATIVE' | 'COPY' | 'OFFER' | 'TARGETING'
  content: {
    headline?: string
    description?: string
    imageUrl?: string
    videoUrl?: string
    ctaText?: string
    offerAmount?: number
    targetingOptions?: Record<string, any>
  }
  configuration: Record<string, any>
  trafficSplit: number // Percentage of traffic (0-100)
  metrics: VariantMetrics
}

export interface VariantMetrics {
  impressions: number
  clicks: number
  conversions: number
  revenue: number
  cost: number
  ctr: number // Click-through rate
  conversionRate: number
  cpa: number // Cost per acquisition
  roas: number // Return on ad spend
  engagementRate: number
  sampleSize: number
  confidence: number
  confidenceInterval?: {
    lower: number
    upper: number
  }
}

export interface TestResult {
  winner: {
    variantId: string
    confidence: number
    uplift: number
    significance: boolean
  }
  significance: {
    pValue: number
    isSignificant: boolean
    confidence: number
  }
  comparison: Array<{
    variantId: string
    metrics: VariantMetrics
    performance: {
      primary: number
      secondary: Record<string, number>
    }
  }>
  recommendations: string[]
  insights: string[]
}

export class ABTestingPlatform {
  private readonly STATISTICAL_FUNCTIONS = {
    calculateZScore: (control: number, variant: number, controlSize: number, variantSize: number) => {
      const controlRate = control / controlSize
      const variantRate = variant / variantSize
      const pooledRate = (control + variant) / (controlSize + variantSize)
      const standardError = Math.sqrt(pooledRate * (1 - pooledRate) * (1/controlSize + 1/variantSize))
      return standardError > 0 ? (variantRate - controlRate) / standardError : 0
    },

    calculatePValue: (zScore: number) => {
      // Simplified p-value calculation
      const absZ = Math.abs(zScore)
      if (absZ < 1.96) return 0.05
      if (absZ < 2.58) return 0.01
      return 0.001
    },

    calculateConfidenceInterval: (rate: number, sampleSize: number, confidence: number) => {
      const zScore = confidence === 0.95 ? 1.96 : confidence === 0.99 ? 2.58 : 1.645
      const standardError = Math.sqrt((rate * (1 - rate)) / sampleSize)
      const margin = zScore * standardError
      return {
        lower: Math.max(0, rate - margin),
        upper: Math.min(1, rate + margin)
      }
    }
  }

  async createTest(testData: Omit<ABTest, 'id' | 'createdAt' | 'results'>): Promise<ABTest> {
    try {
      // Validate test configuration
      this.validateTestConfiguration(testData)

      // Generate unique test ID
      const testId = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

      // Validate traffic splits sum to 100
      const totalTraffic = testData.variants.reduce((sum, variant) => sum + variant.trafficSplit, 0)
      if (Math.abs(totalTraffic - 100) > 0.1) {
        throw new Error('Traffic splits must sum to 100%')
      }

      const abTest: ABTest = {
        ...testData,
        id: testId,
        createdAt: new Date().toISOString(),
        status: 'DRAFT'
      }

      // Save test to database
      await this.saveTest(abTest)

      return abTest
    } catch (error) {
      console.error('Error creating A/B test:', error)
      throw error
    }
  }

  async startTest(testId: string): Promise<ABTest> {
    try {
      const test = await this.getTest(testId)

      if (test.status !== 'DRAFT') {
        throw new Error('Test can only be started from DRAFT status')
      }

      if (test.variants.length < 2) {
        throw new Error('Test must have at least 2 variants')
      }

      // Initialize variant metrics
      test.variants = test.variants.map(variant => ({
        ...variant,
        metrics: {
          impressions: 0,
          clicks: 0,
          conversions: 0,
          revenue: 0,
          cost: 0,
          ctr: 0,
          conversionRate: 0,
          cpa: 0,
          roas: 0,
          engagementRate: 0,
          sampleSize: 0,
          confidence: 0
        }
      }))

      // Update test status
      test.status = 'RUNNING'
      test.startDate = new Date().toISOString()

      await this.saveTest(test)

      // Start tracking
      await this.startTracking(testId)

      return test
    } catch (error) {
      console.error('Error starting A/B test:', error)
      throw error
    }
  }

  async recordConversion(
    testId: string,
    variantId: string,
    conversionData: {
      type: 'click' | 'conversion' | 'revenue'
      value?: number
      metadata?: Record<string, any>
    }
  ): Promise<void> {
    try {
      const test = await this.getTest(testId)

      if (test.status !== 'RUNNING') {
        throw new Error('Test is not currently running')
      }

      const variant = test.variants.find(v => v.id === variantId)
      if (!variant) {
        throw new Error('Variant not found')
      }

      // Update metrics based on conversion type
      switch (conversionData.type) {
        case 'click':
          variant.metrics.clicks++
          break
        case 'conversion':
          variant.metrics.conversions++
          if (conversionData.value) {
            variant.metrics.revenue += conversionData.value
          }
          break
        case 'revenue':
          if (conversionData.value) {
            variant.metrics.revenue += conversionData.value
          }
          break
      }

      // Recalculate derived metrics
      this.updateVariantMetrics(variant)

      // Check if test has enough data for statistical significance
      if (this.hasEnoughData(test)) {
        await this.calculateTestResults(test)
      }

      await this.saveTest(test)
    } catch (error) {
      console.error('Error recording conversion:', error)
      throw error
    }
  }

  async pauseTest(testId: string): Promise<ABTest> {
    try {
      const test = await this.getTest(testId)

      if (test.status !== 'RUNNING') {
        throw new Error('Test is not currently running')
      }

      test.status = 'PAUSED'
      test.endDate = new Date().toISOString()

      // Calculate final results
      if (this.hasEnoughData(test)) {
        await this.calculateTestResults(test)
      }

      await this.saveTest(test)
      return test
    } catch (error) {
      console.error('Error pausing A/B test:', error)
      throw error
    }
  }

  async completeTest(testId: string): Promise<ABTest> {
    try {
      const test = await this.getTest(testId)

      if (test.status !== 'RUNNING' && test.status !== 'PAUSED') {
        throw new Error('Test must be running or paused to complete')
      }

      test.status = 'COMPLETED'
      test.endDate = new Date().toISOString()

      // Calculate final results
      await this.calculateTestResults(test)

      await this.saveTest(test)
      return test
    } catch (error) {
      console.error('Error completing A/B test:', error)
      throw error
    }
  }

  async getTest(testId: string): Promise<ABTest> {
    // Mock implementation - in reality, fetch from database
    return {
      id: testId,
      campaignId: 'campaign-1',
      name: 'Headline Test - Summer Collection',
      description: 'Test different headline variations for summer campaign',
      status: 'RUNNING',
      startDate: new Date().toISOString(),
      targetAudience: {
        size: 10000,
        demographics: {},
        filters: {}
      },
      variants: [
        {
          id: 'variant-a',
          name: 'Control',
          description: 'Original headline',
          type: 'COPY',
          content: { headline: 'Summer Sale - 50% Off' },
          configuration: {},
          trafficSplit: 50,
          metrics: {
            impressions: 5000,
            clicks: 250,
            conversions: 25,
            revenue: 2500,
            cost: 500,
            ctr: 5,
            conversionRate: 10,
            cpa: 20,
            roas: 5,
            engagementRate: 3,
            sampleSize: 5000,
            confidence: 85
          }
        },
        {
          id: 'variant-b',
          name: 'Test Variant',
          description: 'New headline with urgency',
          type: 'COPY',
          content: { headline: 'Flash Sale - 50% Off Today Only!' },
          configuration: {},
          trafficSplit: 50,
          metrics: {
            impressions: 5000,
            clicks: 350,
            conversions: 42,
            revenue: 4200,
            cost: 500,
            ctr: 7,
            conversionRate: 12,
            cpa: 11.9,
            roas: 8.4,
            engagementRate: 4,
            sampleSize: 5000,
            confidence: 92
          }
        }
      ],
      primaryMetric: 'conversionRate',
      secondaryMetrics: ['ctr', 'roas'],
      significanceLevel: 0.05,
      minimumSampleSize: 1000,
      createdAt: new Date().toISOString(),
      createdBy: 'user-1'
    }
  }

  async getTests(campaignId?: string): Promise<ABTest[]> {
    // Mock implementation - in reality, fetch from database with filters
    return []
  }

  private async calculateTestResults(test: ABTest): Promise<void> {
    if (test.variants.length < 2) return

    const control = test.variants[0]
    const variants = test.variants.slice(1)

    const comparison = test.variants.map(variant => ({
      variantId: variant.id,
      metrics: variant.metrics,
      performance: {
        primary: this.getMetricValue(variant.metrics, test.primaryMetric),
        secondary: test.secondaryMetrics.reduce((acc, metric) => ({
          ...acc,
          [metric]: this.getMetricValue(variant.metrics, metric)
        }), {})
      }
    }))

    // Find winner
    let winner: TestResult['winner'] = {
      variantId: control.id,
      confidence: 50,
      uplift: 0,
      significance: false
    }

    // Calculate statistical significance
    for (const variant of variants) {
      const controlMetric = this.getMetricValue(control.metrics, test.primaryMetric)
      const variantMetric = this.getMetricValue(variant.metrics, test.primaryMetric)

      const zScore = this.STATISTICAL_FUNCTIONS.calculateZScore(
        controlMetric * control.metrics.sampleSize,
        variantMetric * variant.metrics.sampleSize,
        control.metrics.sampleSize,
        variant.metrics.sampleSize
      )

      const pValue = this.STATISTICAL_FUNCTIONS.calculatePValue(zScore)
      const confidence = (1 - pValue) * 100
      const uplift = ((variantMetric - controlMetric) / controlMetric) * 100

      if (confidence > winner.confidence) {
        winner = {
          variantId: variant.id,
          confidence,
          uplift,
          significance: pValue < test.significanceLevel
        }
      }
    }

    // Generate recommendations and insights
    const recommendations = this.generateRecommendations(test, comparison, winner)
    const insights = this.generateInsights(test, comparison)

    test.results = {
      winner,
      significance: {
        pValue: winner.significance ? 0.01 : 0.1,
        isSignificant: winner.significance,
        confidence: winner.confidence
      },
      comparison,
      recommendations,
      insights
    }
  }

  private getMetricValue(metrics: VariantMetrics, metricName: string): number {
    const metricMap: Record<string, keyof VariantMetrics> = {
      'ctr': 'ctr',
      'conversionRate': 'conversionRate',
      'roas': 'roas',
      'cpa': 'cpa',
      'engagementRate': 'engagementRate',
      'revenue': 'revenue',
      'clicks': 'clicks',
      'conversions': 'conversions'
    }

    const key = metricMap[metricName]
    return key ? metrics[key] as number : 0
  }

  private updateVariantMetrics(variant: TestVariant): void {
    const { metrics } = variant

    // Calculate derived metrics
    metrics.ctr = metrics.impressions > 0 ? (metrics.clicks / metrics.impressions) * 100 : 0
    metrics.conversionRate = metrics.clicks > 0 ? (metrics.conversions / metrics.clicks) * 100 : 0
    metrics.cpa = metrics.conversions > 0 ? metrics.cost / metrics.conversions : 0
    metrics.roas = metrics.cost > 0 ? metrics.revenue / metrics.cost : 0
    metrics.engagementRate = metrics.impressions > 0 ? ((metrics.clicks + metrics.conversions) / metrics.impressions) * 100 : 0

    // Calculate confidence interval for primary metric
    if (metrics.sampleSize > 0) {
      metrics.confidenceInterval = this.STATISTICAL_FUNCTIONS.calculateConfidenceInterval(
        metrics.conversionRate / 100,
        metrics.sampleSize,
        0.95
      )
    }
  }

  private hasEnoughData(test: ABTest): boolean {
    const totalSampleSize = test.variants.reduce((sum, variant) => sum + variant.metrics.sampleSize, 0)
    return totalSampleSize >= test.minimumSampleSize
  }

  private validateTestConfiguration(testData: Omit<ABTest, 'id' | 'createdAt' | 'results'>): void {
    if (!testData.campaignId) {
      throw new Error('Campaign ID is required')
    }

    if (!testData.name || testData.name.trim().length === 0) {
      throw new Error('Test name is required')
    }

    if (testData.variants.length < 2) {
      throw new Error('Test must have at least 2 variants')
    }

    if (!testData.primaryMetric) {
      throw new Error('Primary metric is required')
    }

    const totalTraffic = testData.variants.reduce((sum, variant) => sum + variant.trafficSplit, 0)
    if (Math.abs(totalTraffic - 100) > 0.1) {
      throw new Error('Traffic splits must sum to 100%')
    }
  }

  private generateRecommendations(
    test: ABTest,
    comparison: any[],
    winner: TestResult['winner']
  ): string[] {
    const recommendations: string[] = []

    if (winner.significance) {
      recommendations.push(`Implement ${test.variants.find(v => v.id === winner.variantId)?.name} as the new default`)
      recommendations.push(`Expected uplift: ${winner.uplift.toFixed(1)}% in ${test.primaryMetric}`)
    } else {
      recommendations.push('Test needs more time or traffic to reach statistical significance')
      recommendations.push('Consider running the test longer or increasing traffic allocation')
    }

    if (comparison.length > 1) {
      const bestSecondary = comparison
        .sort((a, b) => b.performance.secondary[test.secondaryMetrics[0] || 'ctr'] - a.performance.secondary[test.secondaryMetrics[0] || 'ctr'])[0]

      if (bestSecondary.variantId !== winner.variantId) {
        recommendations.push(`Consider ${test.variants.find(v => v.id === bestSecondary.variantId)?.name} for ${test.secondaryMetrics[0] || 'CTR'} optimization`)
      }
    }

    return recommendations
  }

  private generateInsights(test: ABTest, comparison: any[]): string[] {
    const insights: string[] = []

    const avgCTR = comparison.reduce((sum, c) => sum + c.metrics.ctr, 0) / comparison.length
    const avgConversionRate = comparison.reduce((sum, c) => sum + c.metrics.conversionRate, 0) / comparison.length

    if (avgCTR > 5) {
      insights.push('Strong creative performance with above-average click-through rates')
    } else {
      insights.push('Consider testing new creative concepts to improve engagement')
    }

    if (avgConversionRate > 10) {
      insights.push('Excellent conversion performance indicates strong product-market fit')
    } else {
      insights.push('Landing page optimization may improve conversion rates')
    }

    const revenueVariation = Math.max(...comparison.map(c => c.metrics.revenue)) - Math.min(...comparison.map(c => c.metrics.revenue))
    if (revenueVariation > comparison[0].metrics.revenue * 0.5) {
      insights.push('Significant revenue variance between variants indicates strong test impact')
    }

    return insights
  }

  private async saveTest(test: ABTest): Promise<void> {
    // Mock implementation - save to database
    console.log('Saving A/B test:', test.id)
  }

  private async startTracking(testId: string): Promise<void> {
    // Mock implementation - set up tracking for test conversions
    console.log('Starting tracking for test:', testId)
  }
}