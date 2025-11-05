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
  async analyzeContent(content: any): Promise<ContentAnalysis> {
    try {
      // Extract content data
      const contentData = await this.extractContentData(content)

      // Run analysis pipeline
      const sentimentResult = await this.analyzeSentiment(contentData)
      const complianceResult = await this.checkCompliance(contentData)
      const qualityResult = await this.assessContentQuality(contentData)
      const engagementResult = await this.predictEngagement(contentData)
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

  private async extractContentData(content: any) {
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
    if (typeof content.description === "string") return content.description
    if (typeof content.message === "string") return content.message
    if (typeof content.content === "string") return content.content
    if (typeof content.text === "string") return content.text
    if (typeof content.body === "string") return content.body
    if (typeof content.caption === "string") return content.caption
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

  private extractHashtags(textContent: string): string[] {
    const hashtagRegex = /#(\w+)/g
    const matches = textContent.match(hashtagRegex)
    return matches ? matches.map(match => match.substring(1)) : []
  }

  private extractMentions(textContent: string): string[] {
    const mentionRegex = /@(\w+)/g
    const matches = textContent.match(mentionRegex)
    return matches ? matches.map(match => match.substring(1)) : []
  }

  private async analyzeSentiment(contentData: any): Promise<{
    score: "positive" | "neutral" | "negative"
    numericScore: number
  }> {
    const textContent = contentData.textContent
    const keywords = {
      positive: ["amazing", "love", "incredible", "outstanding", "professional", "creative", "innovative", "engaging", "interactive"],
      negative: ["terrible", "poor", "disappointing", "boring", "slow", "inappropriate", "misleading", "spam", "fake"]
    }

    let score = 0
    let keywordMatches = 0
    const totalKeywords = keywords.positive.length + keywords.negative.length

    keywords.positive.forEach(keyword => {
      if (textContent.toLowerCase().includes(keyword.toLowerCase())) {
        score += 1
        keywordMatches += 1
      }
    })

    keywords.negative.forEach(keyword => {
      if (textContent.toLowerCase().includes(keyword.toLowerCase())) {
        score -= 1
        keywordMatches += 1
      }
    })

    if (keywordMatches > 0) {
      score = score / keywordMatches
    }

    // Consider context
    if (contentData.metadata?.tone === "promotional" || contentData.metadata?.intent === "sales") {
      score += 0.2
    } else if (contentData.metadata?.tone === "complaint") {
      score -= 0.3
    }

    let scoreType: "positive" | "neutral" | "negative" = "neutral"
    if (score >= 0.1) scoreType = "positive"
    else if (score <= -0.1) scoreType = "negative"

    return {
      score: scoreType,
      numericScore: score
    }
  }

  private async checkCompliance(contentData: any): Promise<{
    score: number
    redFlags: string[]
  }> {
    const textContent = contentData.textContent
    const complianceIssues: string[] = []

    // Check for disclosure requirements
    if (textContent.toLowerCase().includes("#ad") || textContent.toLowerCase().includes("sponsored")) {
      complianceIssues.push("Missing proper disclosure format")
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
      complianceIssues.push("Content too long for optimal engagement")
    }

    // Calculate compliance score (100 = fully compliant)
    const baseScore = 100 - (complianceIssues.length * 20)
    const textComplexity = Math.min(textContent.length / 1000, 1)

    return {
      score: baseScore * textComplexity,
      redFlags: complianceIssues
    }
  }

  private async assessContentQuality(contentData: any): Promise<{
    score: number
    redFlags: string[]
  }> {
    const textContent = contentData.textContent
    const mediaType = contentData.mediaType

    let qualityScore = 0.5
    const redFlags: string[] = []

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
    qualityScore = (qualityScore + textQuality.score) / 2
    if (textQuality.redFlags.length > 0) {
      redFlags.push(...textQuality.redFlags)
    }

    return {
      score: qualityScore,
      redFlags
    }
  }

  private async predictEngagement(contentData: any): Promise<{
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
    const followerCount = contentData.followerCount || 1000
    const trustScore = contentData.trustScore || 3

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

    engagementRate = engagementRate * trustMultiplier * followerMultiplier

    // Consider content quality and sentiment
    const sentimentResult = await this.analyzeSentiment(contentData)
    const sentimentMultiplier = sentimentResult.score === "positive" ? 1.2 : (sentimentResult.score === "negative" ? 0.8 : 1.0)

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

  private async analyzeDemographics(contentData: any): Promise<{
    hashtags: string[]
    data: any
  }> {
    // Mock implementation - in real system would use AI/ML
    const hashtags = contentData.hashtags || []

    return {
      hashtags,
      data: {
        ageRanges: [
          { range: "18-24", percentage: 0.35 },
          { range: "25-34", percentage: 0.45 },
          { range: "35-44", percentage: 0.15 },
          { range: "45+", percentage: 0.05 }
        ],
        genders: [
          { gender: "female", percentage: 0.65 },
          { gender: "male", percentage: 0.35 }
        ],
        locations: [
          { country: "United States", percentage: 0.45 },
          { country: "United Kingdom", percentage: 0.15 },
          { country: "Canada", percentage: 0.10 },
          { country: "Australia", percentage: 0.08 },
          { country: "Other", percentage: 0.22 }
        ]
      }
    }
  }

  private async assessImageQuality(contentData: any): Promise<{
    score: number
    redFlags: string[]
  }> {
    let score = 0.8
    const redFlags: string[] = []

    // Check image dimensions and quality
    if (contentData.metadata?.dimensions) {
      const { width, height } = contentData.metadata.dimensions
      const idealRatio = width / height

      // Penalize non-standard aspect ratios
      if (idealRatio < 0.8 || idealRatio > 1.25) {
        redFlags.push("Unconventional aspect ratio")
        score -= 0.1
      }
    }

    // Check image resolution
    if (contentData.metadata?.resolution) {
      const resolution = contentData.metadata.resolution
      if (resolution < 300000) {
        redFlags.push("Low image resolution")
        score -= 0.2
      } else if (resolution < 1000000) {
        redFlags.push("Medium image resolution")
        score -= 0.1
      }
    }

    return { score, redFlags }
  }

  private async assessVideoQuality(contentData: any): Promise<{
    score: number
    redFlags: string[]
  }> {
    let score = 0.5 // Base score
    const redFlags: string[] = []

    // Check video duration
    const duration = contentData.metadata?.duration
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
    if (contentData.metadata?.resolution) {
      const resolution = contentData.metadata.resolution
      // 720p minimum for Instagram Reels
      if (resolution < 720) {
        redFlags.push("Low video resolution")
        score -= 0.3
      }
    }

    return { score, redFlags }
  }

  private async assessTextQuality(textContent: string): Promise<{
    score: number
    redFlags: string[]
  }> {
    let score = 0.5
    const redFlags: string[] = []

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

  private calculateReadability(textContent: string): number {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10)
    if (sentences.length === 0) return 0

    const avgSentenceLength = sentences.reduce((sum, sentence) => sum + sentence.length, 0) / sentences.length

    // Penalty for overly long sentences
    const longSentencePenalty = avgSentenceLength > 30 ? 0.1 : 0

    // Bonus for shorter sentences
    const shortSentenceBonus = avgSentenceLength < 15 ? 0.1 : 0

    return Math.max(0.2, Math.min(1.0, avgSentenceLength / 20 + shortSentenceBonus - longSentencePenalty))
  }

  private generateRecommendations(qualityResult: any): string[] {
    const recommendations: string[] = []

    if (qualityResult.score < 0.3) {
      recommendations.push("Consider professional content creation services")
      recommendations.push("Improve content quality before posting")
    }

    if (qualityResult.redFlags.length > 0) {
      recommendations.push("Review and fix content issues before posting")
    }

    if (qualityResult.score < 0.7) {
      recommendations.push("Add more visual elements to increase engagement")
    }

    if (qualityResult.redFlags.length > 2) {
      recommendations.push("Consider comprehensive content improvement")
    }

    if (qualityResult.redFlags.length === 0 && qualityResult.score > 0.8) {
      recommendations.push("Content quality is excellent")
    } else {
      recommendations.push("Content is good, but could be improved")
    }

    return recommendations
  }

  private async extractVisualElements(contentData: any): Promise<{
    objects_detected: string[]
    colors_used: string[]
    text_contrast: number
  }> {
    // Mock implementation - in real system would use computer vision
    const detectedObjects: string[] = []
    const colors: string[] = []

    const mockObjects = ["person", "product", "brand", "logo", "text"]
    const mockColors = ["red", "blue", "green", "yellow", "purple", "orange"]

    mockObjects.forEach(obj => {
      if (Math.random() > 0.5) {
        detectedObjects.push(obj)
      }
    })

    mockColors.forEach(color => {
      if (Math.random() > 0.3) {
        colors.push(color)
      }
    })

    return {
      objects_detected: detectedObjects,
      colors_used: colors,
      text_contrast: Math.random() + 0.5
    }
  }
}