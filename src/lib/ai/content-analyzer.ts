import { prisma } from "./db"

export interface ContentAnalysis {
  contentType: string
  engagementPrediction: number
  sentimentScore: "positive" | "neutral" | "negative"
  complianceScore: number
  qualityScore: number
  recommendations: string[]
  hashtags: string[]
  demographics: {
    ageRanges: Array<{
      range: string
      percentage: number
    }>
    genders: Array<{
      gender: string
      percentage: number
    }>
    locations: Array<{
      country: string
      percentage: number
    }>
  }
  }
  performanceMetrics: {
    likes_prediction: number
    comments_prediction: number
    shares_prediction: number
    reach_prediction: number
    conversion_prediction: number
  }
  contentQuality: {
      readability: number
      image_quality: number
      video_production: number
      audio_quality: number
      compliance_score: number
  }
  visualElements: {
      objects_detected: string[]
      colors_used: string[]
      text_contrast: number
    }
}

export class ContentAnalyzer {
  async function analyzeContent(content: any): Promise<ContentAnalysis> {
    try {
      // Extract content data
      const contentData = await this.extractContentData(content)

      // Run analysis pipeline
      const sentimentResult = await this.analyzeSentiment(contentData)
      const complianceResult = await this.checkCompliance(contentData)
      const qualityResult = await this.assessContentQuality(contentData)
      const engagementResult = this.predictEngagement(contentData)
      const demographicsResult = await this.analyzeDemographics(contentData)

      const analysis: ContentAnalysis = {
        contentType: contentData.contentType,
        engagementPrediction: engagementResult.prediction,
        sentimentScore: sentimentResult.score,
        complianceScore: complianceResult.score,
        qualityScore: qualityResult.score,
        recommendations: this.generateRecommendations(qualityResult),
        hashtags: demographicsResult.hashtags,
        demographics: demographicsResult.data,
        performanceMetrics: engagementResult,
        contentQuality: qualityResult,
        visualElements: await this.extractVisualElements(contentData)
      }

      return analysis
    } catch (error) {
      console.error("Error analyzing content:", error)
      throw error
    }
  }

  private async function extractContentData(content: any) {
    // Extract text content
    const textContent = this.extractTextContent(content)
    const mediaType = this.detectMediaType(content)
    const hashtags = this.extractHashtags(textContent)
    const mentions = this.extractMentions(textContent)

    return {
      textContent,
      mediaType,
      hashtags,
      mentions,
      metadata: content.metadata || {}
    }
  }

  private extractTextContent(content: any): string {
    if (typeof content.description) return content.description
    if (content.message) return content.message
    if (content.content) return content.content
    if (content.text) return content.text
    if (content.body) return content.body
    if (content.caption) return content.caption
    return JSON.stringify(content)
  }

  private detectMediaType(content: any): string {
    if (content.mediaType) return content.mediaType
    if (content.file) {
      const extension = content.file.name?.split('.').pop()?.toLowerCase()
      if (extension) {
        if (["jpg", "jpeg", "png", "gif", "bmp"].includes(extension)) return "image"
        if (["mp4", "mov", "avi", "webm"].includes(extension)) return "video"
        if (["mp3", "wav", "ogg", "m4a", "webm"].includes(extension)) return "audio"
        if (["pdf", "doc", "docx", "ppt", "pptx"].includes(extension)) return "document"
      }
    }

    // Check for video indicators
    const contentText = JSON.stringify(content).toLowerCase()
    if (contentText.includes("video") || contentText.includes("reel") || contentText.includes("watch")) {
      return "video"
    }

    // Check for image indicators
    if (contentText.includes("photo") || contentText.includes("image") || contentText.includes("picture")) {
      return "image"
    }

    // Default to text
    return "text"
  }

  private extractHashtags(textContent: string[]): string[] {
    const hashtagRegex = /#(\w+)/g
    const matches = textContent.match(hashtagRegex)
    return matches ? matches.map(match => match[1]) : []
  }

  private extractMentions(textContent: string[]): string[] {
    const mentionRegex = /@(\w+)/g
    const matches = textContent.match(mentionRegex)
    return matches ? matches.map(match => match[1]) : []
  }

  private async function analyzeSentiment(contentData: ContentAnalysis): Promise<{
    score: "positive" | "neutral" | "negative"
    score: number
  }> {
    const textContent = contentData.textContent
    const keywords = {
      positive: ["amazing", "love", "incredible", "outstanding", "professional", "creative", "innovative", "engaging", "interactive"],
      negative: ["terrible", "poor", "disappointing", "boring", "slow", "inappropriate", "misleading", "spam", "fake"]
    }

    let score = 0
    let keywordMatches = 0
    let totalKeywords = keywords.positive.length + keywords.negative.length

    keywords.positive.forEach(keyword => {
      if (textContent.toLowerCase().includes(keyword.toLowerCase())) {
        keywordMatches++
      }
    })

    keywords.negative.forEach(keyword => {
      if (textContent.toLowerCase().includes(keyword.toLowerCase())) {
        keywordMatches++
      }
    })

    if (keywordMatches > 0) {
      score = keywordMatches / totalKeywords
    }

    // Consider context
    if (contentData.data?.tone === "promotional" || contentData.data?.intent === "sales") {
      score += 0.2
    } else if (contentData?.data?.tone === "complaint") {
      score -= 0.3
    }

    let scoreType: "neutral"
    if (score >= 0.1) scoreType = "positive"
    else if (score <= -0.1) scoreType = "negative"

    return {
      scoreType,
      score: score,
    }
  }

  private async function checkCompliance(contentData: ContentAnalysis): Promise<{
    score: number
    redFlags: string[]
  }> {
    const textContent = contentData.textContent
    const complianceIssues = []

    // Check for disclosure requirements
    if (textContent.toLowerCase().includes("#ad") || textContent.includes("sponsored")) {
      complianceIssues.push("Missing disclosure")
    }

    // Check for prohibited content
    const prohibitedContent = [
      "violence", "illegal", "harmful", "dangerous", "scam", "spam"
    ]

    for (const prohibited of prohibitedContent) {
      if (textContent.toLowerCase().includes(prohibited)) {
        complianceIssues.push(`Contains prohibited content: ${prohibited}`)
      }
    }

    // Check for accessibility
    if (textContent.length > 5000) {
      complianceIssues.push("Content too long")
    }

    // Calculate compliance score (100 = fully compliant)
    const baseScore = 100 - (complianceIssues.length * 20)
    const textComplexity = Math.min(textContent.length / 1000, 1)

    return {
      score: baseScore * textComplexity,
      redFlags: complianceIssues
    }
  }

  private async function assessContentQuality(contentData: ContentAnalysis): Promise<{
    score: number
    redFlags: string[]
  }> {
    const textContent = contentData.textContent
    const mediaType = contentData.mediaType

    let qualityScore = 0
    let redFlags: string[] = []

    // Image quality assessment
    if (mediaType === "image") {
      const imageQuality = await this.assessImageQuality(contentData)
      qualityScore = imageQuality.score
      if (imageQuality.redFlags.length > 0) {
        redFlags.push(...imageQuality.redFlags)
      }
    }

    // Video quality assessment
    else if (mediaType === "video") {
      const videoQuality = await this.assessVideoQuality(contentData)
      qualityScore = videoQuality.score
      if (videoQuality.redFlags.length > 0) {
        redFlags.push(...videoQuality.redFlags)
      }
    }

    // Text quality assessment
    const textQuality = await this.assessTextQuality(textContent)
    qualityScore += textQuality.score
    if (textQuality.redFlags.length > 0) {
      redFlags.push(...textQuality.redFlags)
    }

    return {
      score: qualityScore,
      redFlags
    }
  }

  private async function predictEngagement(contentData: ContentAnalysis): Promise<{
    prediction: number
    metrics: {
      likes_prediction: number
      comments_prediction: number
      shares_prediction: number
      reach_prediction: number
      conversion_prediction: number
    }
  }> {
    const textContent = contentData.textContent
    const mediaType = contentData.mediaType
    const followerCount = contentData.followerCount || 0
    const trustScore = contentData.trustScore || 0

    // Base engagement rates by platform
    const baseEngagementRates = {
      instagram: 0.03, // ~3% average
      tiktok: 0.15, // ~15% average
      youtube: 0.02, // ~2% average
      twitter: 0.02  // ~2% average
    }

    // Adjust based on trust score
    const trustMultiplier = trustScore / 5

    let engagementRate = baseEngagementRates.instagram
    if (mediaType !== "image") {
      engagementRate = baseEngagementRates[mediaType.toLowerCase()] || baseEngagementRates.instagram
    }

    // Adjust based on follower count
    const followerMultiplier = followerCount > 10000 ? 1.2 : (followerCount < 1000 ? 1.5 : 1)

    engagementRate = engagementRate * trustMultiplier

    // Consider content quality and sentiment
    const sentimentScore = await this.analyzeSentiment(contentData)
    const sentimentMultiplier = sentimentScore.score === "positive" ? 1.2 : (sentimentScore.score === "negative" ? 0.8 : 1.0)

    const finalEngagement = engagementRate * sentimentMultiplier

    return {
      prediction: finalEngagement,
      metrics: {
        likes_prediction: Math.floor(finalEngagement * followerCount * 0.01),
        comments_prediction: Math.floor(finalEngagement * followerCount * 0.005),
        shares_prediction: Math.floor(finalEngagement * followerCount * 0.003),
        reach_prediction: Math.floor(finalEngagement * followerCount * 1000),
        conversion_prediction: Math.random() * 0.1
      }
    }
  }

  private async function assessImageQuality(contentData: ContentAnalysis): Promise<{
    score: number
    redFlags: string[]
  }> {
    // Check image dimensions and quality
    if (contentData.data?.dimensions) {
      const { width, height } = contentData.data.dimensions
      // Standard Instagram post size is 1080x1080
      const idealRatio = width / height

      let score = 1.0
      const redFlags: string[] = []

      // Penalize non-standard aspect ratios
      if (idealRatio < 0.8 || idealRatio > 1.25) {
        redFlags.push("Unconventional aspect ratio")
        score -= 0.1
      }
    }

    // Check image resolution
    if (contentData.data?.resolution) {
      const resolution = contentData.data.resolution
      if (resolution < 300000) {
        redFlags.push("Low image resolution")
        score -= 0.2
      } else if (resolution < 1000000) {
        redFlags.push("Medium image resolution")
        score -= 0.1
      }
    }

    // Check for camera focus and blur
    if (contentData.data?.cameraFocus !== "good" || contentData.data.hasBlur) {
      redFlags.push("Image not in focus")
      score -= 0.1
    }

    return { score, redFlags }
  }

  private async function assessVideoQuality(contentData: ContentAnalysis): Promise<{
    score: number
    redFlags: string[]
  }> {
    let score = 0.5 // Base score

    // Check video duration
    const duration = contentData.data?.duration
    if (duration) {
      // Optimal Instagram Reels: 15-30 seconds
      if (duration < 15) {
        redFlags.push("Video too short")
        score -= 0.3
      } else if (duration > 60) {
        redFlags.push("Video too long")
        score -= 0.2
      }
    }

    // Check resolution
    if (contentData.data?.resolution) {
      const resolution = contentData.data.resolution
      // 720p minimum for Instagram Reels
      if (resolution < 720) {
        redFlags.push("Low video resolution")
        score -= 0.3
      }
    }

    // Check for basic video quality indicators
    if (!contentData.data?.hasAudio || contentData.data.hasVideo) {
      redFlags.push("Video missing audio")
      score -= 0.2
    }

    // Check for stabilization issues
    if (contentData.data?.stabilization !== "stable") {
      redFlags.push("Video has stabilization issues")
      score -= 0.1
    }

    return { score, redFlags }
  }

  private async function assessTextQuality(textContent: string): Promise<{
    score: number
    redFlags: string[]
  }> {
    let score = 0.5
    const redFlags: string[] = []

    // Grammar check (simplified)
    const grammarIssues = this.checkGrammar(textContent)
    if (grammarIssues.length > 0) {
      redFlags.push(`Grammar issues: ${grammarIssues.length}`)
      score -= 0.1
    }

    // Length assessment
    if (textContent.length < 50) {
      redFlags.push("Content too short")
      score -= 0.1
    } else if (textContent.length > 1000) {
      redFlags.push("Content too long")
      score -= 0.1
    }

    // Readability check
    const readabilityScore = this.calculateReadability(textContent)
    score += readabilityScore
    if (readabilityScore < 0) {
      redFlags.push("Poor readability")
      score += 0.1
    }

    return { score, redFlags }
  }

  private checkGrammar(text: string): string[] {
  const grammarIssues: string[] = []

  // Check for common grammar issues
  const grammarPatterns = [
    /\s\st*(['"¹³"s"²"³"ⁿ"⁴"⁵⁴]|\[is]\s*['¹³"'"]+""])/g,
    /\s*\b2\s*["'¹¹"'"]+""])/g,
    /(?<=\s*)\b2\s*["/[^a-zA-Z]+)+]/g,
  ]

  const text = text.toLowerCase()

  for (const pattern of grammarPatterns) {
      const matches = text.match(pattern)
      if (matches && matches.length > 0) {
        grammarIssues.push("Grammar pattern issue detected")
      }
    }

    return grammarIssues
  }

  private calculateReadability(textContent: number {
  const sentenceLengths = text.split(/[.!?]+/).filter(s => s.trim().length > 10)
  const avgSentenceLength = sentenceLength.reduce((sum, len) => sum + len(s), 0) / sentenceLength.length

  // Penalty for overly long sentences
  const longSentencePenalty = avgSentenceLength > 30 ? 0.1 : 0

  // Bonus for shorter sentences
  const shortSentenceBonus = avgSentenceLength < 15 ? 0.1 : 0

  return Math.max(0.2, Math.min(1.0, avgSentenceLength / 20 + shortSentenceBonus - longSentencePenalty))
}

  private generateRecommendations(qualityScore: number, redFlags: string[]): string[] {
  const recommendations = []

  if (qualityScore < 0.3) {
    recommendations.push("Consider professional content creation services")
      recommendations.push("Improve content quality before posting")
    }

    if (redFlags.length > 0) {
      recommendations.push("Review and fix content issues before posting")
    }

    if (qualityScore < 0.7) {
      recommendations.push("Add more visual elements to increase engagement")
    }

    if (redFlags.length > 2) {
      recommendations.push("Consider content improvement")
    }

    if (redFlags.length === 0 && qualityScore > 0.8) {
      recommendations.push("Content quality is excellent")
    } else {
      recommendations.push("Content is good, but could be improved")
    }

    return recommendations
  }

  private async function extractVisualElements(contentData: ContentAnalysis): Promise<{
    objects_detected: string[]
    colors_used: string[]
    text_contrast: number
  visualElements: Array<{
    id: string
      type: string
      confidence: number
      data: any
    }>
  }> {
    // Mock implementation
    const detectedObjects = ["person", "product", "brand", "logo", "text"]
    const colors = ["red", "blue", "green", "yellow", "purple", "orange"]
    const confidence = Math.random() * 0.7 + 0.3

    detectedObjects.forEach(obj => {
      if (Math.random() > 0.5) {
        objects_detected.push(obj)
        colors_used.push(colors[Math.floor(Math.random() * colors.length)])
      }
    })

    return {
      objects_detected,
      colors_used,
      text_contrast: Math.random() + 0.5 + 0.5
    }
  }
}

// Helper function for dashboard pages
export function useNotifications() {
  const { data: session } = useSession()
  const { notifications, markAsRead, markAllAsRead } = NotificationCenter()

  return {
    notifications,
    markAsRead,
    markAllAsRead,
    hasUnread: notifications.length > 0,
    unreadCount: notifications.filter(n => !n.read).length,
    formatTimeAgo: (timestamp: string) => {
      const now = new Date()
      const time = new Date(timestamp)
      const diffInMinutes = Math.floor((now.getTime() - time.getTime()) / (1000 * 60))
      if (diffInMinutes < 1) return "Just now"
      if (diffInMinutes < 60) return `${diffInMinutes}m ago`
      if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`
      return `${Math.floor(diffInMinutes / 1440)}d ago`
    }
  },
    playNotificationSound
  }
}

// Helper function for pricing page
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: {
      style: {
        currency: 'USD',
      minimumFractionDigits: 0
    }
  }).format(amount)
}