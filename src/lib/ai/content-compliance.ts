import { prisma } from "../db"

export interface ComplianceRule {
  id: string
  brandId: string
  name: string
  type: 'PROHIBITED_CONTENT' | 'REQUIRED_ELEMENTS' | 'BRAND_GUIDELINES' | 'LEGAL_REQUIREMENTS'
  description: string
  isActive: boolean
  conditions: {
    keywords?: string[]
    categories?: string[]
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    autoReject?: boolean
    requiresReview?: boolean
  }
  actions: {
    flag: boolean
    warn: boolean
    reject: boolean
    escalate: boolean
  }
}

export interface ComplianceCheck {
  contentId: string
  contentType: 'image' | 'video' | 'text' | 'story'
  influencerId: string
  campaignId: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FLAGGED'
  score: number // 0-100, higher is safer
  violations: ComplianceViolation[]
  recommendations: string[]
  checkedAt: Date
  checkedBy: 'AI' | 'HUMAN'
}

export interface ComplianceViolation {
  id: string
  ruleId: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  category: 'CONTENT' | 'LEGAL' | 'BRAND' | 'SAFETY'
  description: string
  location?: {
    type: 'text' | 'image' | 'video'
    coordinates?: string
    timestamp?: number
  }
  autoAction: 'NONE' | 'FLAG' | 'WARN' | 'REJECT'
  requiredAction: 'NONE' | 'REVIEW' | 'MODIFY' | 'REJECT'
}

export interface BrandGuideline {
  id: string
  brandId: string
  name: string
  elements: {
    logoUsage: {
      required: boolean
      minSize: number
      maxVariations: number
      clearSpace: number
    }
    colorPalette: {
      primary: string[]
      secondary: string[]
      prohibited: string[]
    }
    toneOfVoice: {
      formal: boolean
      casual: boolean
      humorous: boolean
      professional: boolean
    }
    prohibitedContent: string[]
    requiredHashtags: string[]
    disclosureFormat: string
  }
}

export class ContentComplianceChecker {
  private readonly prohibitedCategories = [
    'violence', 'hate_speech', 'adult_content', 'illegal_activities',
    'misinformation', 'spam', 'scams', 'self_harm', 'terrorism'
  ]

  private readonly brandSafetyKeywords = {
    LOW: ['slightly_inappropriate', 'borderline_content'],
    MEDIUM: ['inappropriate_language', 'misleading_claims'],
    HIGH: ['offensive_content', 'harmful_speech'],
    CRITICAL: ['hate_speech', 'violence', 'illegal_content']
  }

  async checkContentCompliance(
    contentId: string,
    influencerId: string,
    campaignId: string,
    contentData: any,
    contentType: 'image' | 'video' | 'text' | 'story'
  ): Promise<ComplianceCheck> {
    try {
      // Get campaign and brand information
      const campaign = await prisma.campaign.findUnique({
        where: { id: campaignId },
        include: {
          brand: {
            include: {
              user: true
            }
          }
        }
      })

      if (!campaign) {
        throw new Error('Campaign not found')
      }

      // Get brand compliance rules
      const complianceRules = await this.getComplianceRules(campaign.brandId)

      // Get brand guidelines
      const brandGuidelines = await this.getBrandGuidelines(campaign.brandId)

      // Run compliance checks
      const violations: ComplianceViolation[] = []

      // 1. Text content analysis
      if (contentData.textContent) {
        const textViolations = await this.analyzeTextContent(
          contentData.textContent,
          complianceRules,
          brandGuidelines
        )
        violations.push(...textViolations)
      }

      // 2. Visual content analysis
      if (['image', 'video'].includes(contentType)) {
        const visualViolations = await this.analyzeVisualContent(
          contentData,
          complianceRules,
          brandGuidelines
        )
        violations.push(...visualViolations)
      }

      // 3. Brand guideline compliance
      const guidelineViolations = await this.checkBrandGuidelines(
        contentData,
        brandGuidelines,
        contentType
      )
      violations.push(...guidelineViolations)

      // 4. Legal and disclosure requirements
      const legalViolations = await this.checkLegalRequirements(
        contentData,
        campaign,
        contentType
      )
      violations.push(...legalViolations)

      // Calculate compliance score
      const score = this.calculateComplianceScore(violations, contentData, contentType)

      // Determine status
      const status = this.determineComplianceStatus(violations, score)

      // Generate recommendations
      const recommendations = this.generateRecommendations(violations, score)

      // Create compliance check record
      const complianceCheck: ComplianceCheck = {
        contentId,
        contentType,
        influencerId,
        campaignId,
        status,
        score,
        violations,
        recommendations,
        checkedAt: new Date(),
        checkedBy: 'AI'
      }

      // Save to database
      await this.saveComplianceCheck(complianceCheck)

      // Auto-process if configured
      await this.processComplianceResult(complianceCheck, campaign.brandId)

      return complianceCheck
    } catch (error) {
      console.error('Error checking content compliance:', error)
      throw error
    }
  }

  private async getComplianceRules(brandId: string): Promise<ComplianceRule[]> {
    // Mock implementation - in real system, fetch from database
    return [
      {
        id: 'rule-1',
        brandId,
        name: 'Prohibited Content',
        type: 'PROHIBITED_CONTENT',
        description: 'Content containing prohibited elements',
        isActive: true,
        conditions: {
          keywords: ['violence', 'hate', 'adult'],
          categories: this.prohibitedCategories,
          severity: 'CRITICAL',
          autoReject: true,
          requiresReview: false
        },
        actions: {
          flag: true,
          warn: false,
          reject: true,
          escalate: true
        }
      },
      {
        id: 'rule-2',
        brandId,
        name: 'Brand Safety',
        type: 'BRAND_GUIDELINES',
        description: 'Brand safety compliance',
        isActive: true,
        conditions: {
          keywords: ['competitor', 'negative_review'],
          severity: 'MEDIUM',
          autoReject: false,
          requiresReview: true
        },
        actions: {
          flag: true,
          warn: true,
          reject: false,
          escalate: false
        }
      }
    ]
  }

  private async getBrandGuidelines(brandId: string): Promise<BrandGuideline> {
    // Mock implementation - in real system, fetch from database
    return {
      id: 'guideline-1',
      brandId,
      name: 'Brand Guidelines',
      elements: {
        logoUsage: {
          required: true,
          minSize: 100,
          maxVariations: 2,
          clearSpace: 20
        },
        colorPalette: {
          primary: ['#FF0000', '#00FF00', '#0000FF'],
          secondary: ['#FFFF00', '#FF00FF'],
          prohibited: ['#000000', '#808080']
        },
        toneOfVoice: {
          formal: true,
          casual: false,
          humorous: false,
          professional: true
        },
        prohibitedContent: ['alcohol', 'tobacco', 'gambling'],
        requiredHashtags: ['#ad', '#sponsored'],
        disclosureFormat: '#ad #sponsored'
      }
    }
  }

  private async analyzeTextContent(
    textContent: string,
    rules: ComplianceRule[],
    guidelines: BrandGuideline
  ): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = []
    const normalizedText = textContent.toLowerCase()

    // Check prohibited keywords
    for (const rule of rules) {
      if (rule.conditions.keywords) {
        for (const keyword of rule.conditions.keywords) {
          if (normalizedText.includes(keyword.toLowerCase())) {
            violations.push({
              id: `violation-${Date.now()}-${Math.random()}`,
              ruleId: rule.id,
              severity: rule.conditions.severity,
              category: 'CONTENT',
              description: `Contains prohibited keyword: ${keyword}`,
              location: {
                type: 'text',
                coordinates: this.findTextPosition(textContent, keyword)
              },
              autoAction: rule.actions.reject ? 'REJECT' : rule.actions.flag ? 'FLAG' : 'NONE',
              requiredAction: rule.conditions.autoReject ? 'REJECT' : 'REVIEW'
            })
          }
        }
      }
    }

    // Check brand guidelines
    if (guidelines.elements.prohibitedContent) {
      for (const prohibited of guidelines.elements.prohibitedContent) {
        if (normalizedText.includes(prohibited.toLowerCase())) {
          violations.push({
            id: `violation-${Date.now()}-${Math.random()}`,
            ruleId: 'brand-guideline',
            severity: 'HIGH',
            category: 'BRAND',
            description: `Contains brand-prohibited content: ${prohibited}`,
            location: {
              type: 'text',
              coordinates: this.findTextPosition(textContent, prohibited)
            },
            autoAction: 'FLAG',
            requiredAction: 'MODIFY'
          })
        }
      }
    }

    // Check required hashtags
    if (guidelines.elements.requiredHashtags) {
      for (const requiredHashtag of guidelines.elements.requiredHashtags) {
        if (!textContent.toLowerCase().includes(requiredHashtag.toLowerCase())) {
          violations.push({
            id: `violation-${Date.now()}-${Math.random()}`,
            ruleId: 'required-hashtag',
            severity: 'MEDIUM',
            category: 'BRAND',
            description: `Missing required hashtag: ${requiredHashtag}`,
            autoAction: 'NONE',
            requiredAction: 'MODIFY'
          })
        }
      }
    }

    return violations
  }

  private async analyzeVisualContent(
    contentData: any,
    rules: ComplianceRule[],
    guidelines: BrandGuideline
  ): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = []

    // Mock visual analysis - in real system, use computer vision
    if (contentData.metadata?.containsLogos && !guidelines.elements.logoUsage.required) {
      violations.push({
        id: `violation-${Date.now()}-${Math.random()}`,
        ruleId: 'logo-usage',
        severity: 'MEDIUM',
        category: 'BRAND',
        description: 'Unauthorized logo usage detected',
        location: {
          type: 'image',
          coordinates: 'center'
        },
        autoAction: 'FLAG',
        requiredAction: 'REVIEW'
      })
    }

    // Check image quality
    if (contentData.metadata?.resolution < 720) {
      violations.push({
        id: `violation-${Date.now()}-${Math.random()}`,
        ruleId: 'image-quality',
        severity: 'LOW',
        category: 'CONTENT',
        description: 'Low resolution image detected',
        location: {
          type: 'image'
        },
        autoAction: 'NONE',
        requiredAction: 'MODIFY'
      })
    }

    return violations
  }

  private async checkBrandGuidelines(
    contentData: any,
    guidelines: BrandGuideline,
    contentType: string
  ): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = []

    // Check tone of voice compliance
    if (contentData.textContent) {
      const toneAnalysis = await this.analyzeToneOfVoice(contentData.textContent)

      if (guidelines.elements.toneOfVoice.formal && toneAnalysis.formality < 0.5) {
        violations.push({
          id: `violation-${Date.now()}-${Math.random()}`,
          ruleId: 'tone-of-voice',
          severity: 'MEDIUM',
          category: 'BRAND',
          description: 'Content tone is too informal for brand guidelines',
          location: {
            type: 'text'
          },
          autoAction: 'NONE',
          requiredAction: 'MODIFY'
        })
      }

      if (!guidelines.elements.toneOfVoice.humorous && toneAnalysis.humor > 0.5) {
        violations.push({
          id: `violation-${Date.now()}-${Math.random()}`,
          ruleId: 'tone-humor',
          severity: 'MEDIUM',
          category: 'BRAND',
          description: 'Humorous tone not aligned with brand guidelines',
          location: {
            type: 'text'
          },
          autoAction: 'NONE',
          requiredAction: 'MODIFY'
        })
      }
    }

    return violations
  }

  private async checkLegalRequirements(
    contentData: any,
    campaign: any,
    contentType: string
  ): Promise<ComplianceViolation[]> {
    const violations: ComplianceViolation[] = []

    // Check for proper disclosure
    if (contentData.textContent) {
      const hasDisclosure = /(#ad|#sponsored|ad\s+|sponsored\s+)/i.test(contentData.textContent)

      if (!hasDisclosure) {
        violations.push({
          id: `violation-${Date.now()}-${Math.random()}`,
          ruleId: 'disclosure-requirement',
          severity: 'HIGH',
          category: 'LEGAL',
          description: 'Missing required disclosure for sponsored content',
          location: {
            type: 'text'
          },
          autoAction: 'FLAG',
          requiredAction: 'MODIFY'
        })
      }
    }

    // Check age-restricted content compliance
    if (campaign.isAgeRestricted && contentType === 'story') {
      violations.push({
        id: `violation-${Date.now()}-${Math.random()}`,
        ruleId: 'age-restriction',
        severity: 'MEDIUM',
        category: 'LEGAL',
        description: 'Story format not allowed for age-restricted campaigns',
        location: {
          type: 'story'
        },
        autoAction: 'FLAG',
        requiredAction: 'REVIEW'
      })
    }

    return violations
  }

  private calculateComplianceScore(violations: ComplianceViolation[], contentData: any, contentType: string): number {
    let score = 100

    // Deduct points based on violation severity
    for (const violation of violations) {
      switch (violation.severity) {
        case 'CRITICAL':
          score -= 40
          break
        case 'HIGH':
          score -= 20
          break
        case 'MEDIUM':
          score -= 10
          break
        case 'LOW':
          score -= 5
          break
      }
    }

    // Bonus factors
    if (contentData.textContent && contentData.textContent.length > 100) {
      score += 5 // Good content length
    }

    if (contentType === 'image' && contentData.metadata?.resolution >= 1080) {
      score += 5 // High quality image
    }

    return Math.max(0, Math.min(100, score))
  }

  private determineComplianceStatus(violations: ComplianceViolation[], score: number): ComplianceCheck['status'] {
    // Critical violations always result in rejection
    const criticalViolations = violations.filter(v => v.severity === 'CRITICAL')
    if (criticalViolations.length > 0) {
      return 'REJECTED'
    }

    // High severity violations with auto-reject
    const highAutoRejectViolations = violations.filter(
      v => v.severity === 'HIGH' && v.autoAction === 'REJECT'
    )
    if (highAutoRejectViolations.length > 0) {
      return 'REJECTED'
    }

    // Score-based determination
    if (score >= 90) {
      return 'APPROVED'
    } else if (score >= 70) {
      return 'FLAGGED'
    } else {
      return 'REJECTED'
    }
  }

  private generateRecommendations(violations: ComplianceViolation[], score: number): string[] {
    const recommendations: string[] = []

    if (score < 50) {
      recommendations.push('Content requires significant revisions before approval')
    }

    // Specific recommendations based on violations
    for (const violation of violations) {
      switch (violation.category) {
        case 'BRAND':
          recommendations.push('Review brand guidelines and ensure compliance')
          break
        case 'LEGAL':
          recommendations.push('Add proper disclosure and review legal requirements')
          break
        case 'CONTENT':
          recommendations.push('Improve content quality and appropriateness')
          break
        case 'SAFETY':
          recommendations.push('Content may not be safe for brand association')
          break
      }
    }

    // Quality improvements
    if (score < 80) {
      recommendations.push('Consider improving visual quality and engagement potential')
    }

    return recommendations
  }

  private async analyzeToneOfVoice(textContent: string): Promise<{
    formality: number
    humor: number
    professionalism: number
  }> {
    // Mock analysis - in real system, use NLP
    const words = textContent.toLowerCase().split(/\s+/)
    const formalWords = ['therefore', 'furthermore', 'consequently', 'however']
    const casualWords = ['awesome', 'cool', 'nice', 'great']
    const humorousWords = ['funny', 'haha', 'lol', 'jk']

    const formalityScore = words.filter(w => formalWords.includes(w)).length / words.length
    const casualScore = words.filter(w => casualWords.includes(w)).length / words.length
    const humorScore = words.filter(w => humorousWords.includes(w)).length / words.length

    return {
      formality: Math.min(1, formalityScore * 2),
      humor: Math.min(1, humorScore * 3),
      professionalism: Math.min(1, formalityScore + 0.3 - casualScore)
    }
  }

  private findTextPosition(text: string, keyword: string): string {
    const index = text.toLowerCase().indexOf(keyword.toLowerCase())
    if (index === -1) return 'unknown'
    return `position ${index}-${index + keyword.length}`
  }

  private async saveComplianceCheck(check: ComplianceCheck): Promise<void> {
    // Mock implementation - in real system, save to database
    console.log('Saving compliance check:', check)
  }

  private async processComplianceResult(check: ComplianceCheck, brandId: string): Promise<void> {
    // Auto-process based on brand settings
    if (check.status === 'REJECTED') {
      // Send notification to influencer
      await this.notifyRejection(check)
    } else if (check.status === 'FLAGGED') {
      // Send to human review queue
      await this.queueForReview(check)
    } else if (check.status === 'APPROVED') {
      // Send approval notification
      await this.notifyApproval(check)
    }
  }

  private async notifyRejection(check: ComplianceCheck): Promise<void> {
    // Mock notification implementation
    console.log('Content rejected for compliance violations:', check.violations)
  }

  private async notifyApproval(check: ComplianceCheck): Promise<void> {
    // Mock notification implementation
    console.log('Content approved:', check.contentId)
  }

  private async queueForReview(check: ComplianceCheck): Promise<void> {
    // Mock queue implementation
    console.log('Content queued for manual review:', check.contentId)
  }

  // Public methods for manual review
  async getComplianceHistory(
    influencerId?: string,
    campaignId?: string,
    status?: ComplianceCheck['status']
  ): Promise<ComplianceCheck[]> {
    // Mock implementation - in real system, query database
    return []
  }

  async updateComplianceCheck(
    checkId: string,
    updates: Partial<ComplianceCheck>
  ): Promise<ComplianceCheck> {
    // Mock implementation - in real system, update database
    return {} as ComplianceCheck
  }

  async createCustomRule(rule: Omit<ComplianceRule, 'id'>): Promise<ComplianceRule> {
    // Mock implementation - in real system, save to database
    return {
      ...rule,
      id: `rule-${Date.now()}`
    }
  }
}