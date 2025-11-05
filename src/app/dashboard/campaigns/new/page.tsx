"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Calendar, Plus, X, Save, Eye, ArrowLeft, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface CampaignFormData {
  title: string
  description: string
  category: string
  contentType: string
  platform: string
  requirements: {
    targetAudience: string
    contentGuidelines: string
    technicalSpecs: string
    deliverables: string[]
    exclusivity: string
    usageRights: string
  }
  budget: {
    min: string
    max: string
    paymentType: string
  }
  timeline: {
    applicationDeadline: string
    startDate: string
    endDate: string
  }
  visibility: string
  influencerCount: string
  location: string
  isRemote: boolean
}

export default function NewCampaignPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")
  const [isSavingDraft, setIsSavingDraft] = useState(false)

  const [formData, setFormData] = useState<CampaignFormData>({
    title: "",
    description: "",
    category: "",
    contentType: "",
    platform: "",
    requirements: {
      targetAudience: "",
      contentGuidelines: "",
      technicalSpecs: "",
      deliverables: [],
      exclusivity: "",
      usageRights: "",
    },
    budget: {
      min: "",
      max: "",
      paymentType: "FIXED",
    },
    timeline: {
      applicationDeadline: "",
      startDate: "",
      endDate: "",
    },
    visibility: "PUBLIC",
    influencerCount: "1",
    location: "",
    isRemote: true,
  })

  const [newDeliverable, setNewDeliverable] = useState("")

  useEffect(() => {
    if (session?.user?.role !== "BRAND") {
      router.push("/dashboard")
    }
  }, [session, router])

  const categories = [
    "Fashion & Beauty", "Food & Beverage", "Technology", "Travel",
    "Fitness & Health", "Entertainment", "Education", "Automotive",
    "Finance", "Real Estate", "Sports", "Gaming", "Lifestyle", "Parenting"
  ]

  const contentTypes = [
    "Photo", "Video", "Carousel", "Story", "Reel", "Short", "Blog Post",
    "Live Stream", "Podcast", "Review", "Tutorial", "Testimonial"
  ]

  const platforms = [
    "Instagram", "TikTok", "YouTube", "Twitter", "LinkedIn",
    "Facebook", "Twitch", "Pinterest", "Snapchat", "Blog"
  ]

  const deliverableOptions = [
    "Instagram Post", "Instagram Story", "TikTok Video", "YouTube Video",
    "Twitter Thread", "Blog Post", "Facebook Post", "LinkedIn Article",
    "Live Stream", "Photo Gallery", "Video Tutorial", "Product Review"
  ]

  const paymentTypes = [
    { value: "FIXED", label: "Fixed Price" },
    { value: "PER_DELIVERABLE", label: "Per Deliverable" },
    { value: "PERFORMANCE", label: "Performance-based" }
  ]

  const steps = [
    { id: 1, title: "Basic Info", description: "Campaign overview" },
    { id: 2, title: "Content Requirements", description: "Deliverables and guidelines" },
    { id: 3, title: "Budget & Timeline", description: "Payment and scheduling" },
    { id: 4, title: "Review & Launch", description: "Finalize campaign" }
  ]

  const updateFormData = (section: keyof CampaignFormData, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: typeof prev[section] === 'object'
        ? { ...prev[section] as any, [field]: value }
        : value
    }))
  }

  const addDeliverable = () => {
    if (newDeliverable && !formData.requirements.deliverables.includes(newDeliverable)) {
      updateFormData('requirements', 'deliverables', [...formData.requirements.deliverables, newDeliverable])
      setNewDeliverable("")
    }
  }

  const removeDeliverable = (deliverable: string) => {
    updateFormData('requirements', 'deliverables',
      formData.requirements.deliverables.filter(d => d !== deliverable)
    )
  }

  const validateCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return formData.title && formData.description && formData.category &&
               formData.contentType && formData.platform
      case 2:
        return formData.requirements.targetAudience &&
               formData.requirements.contentGuidelines &&
               formData.requirements.deliverables.length > 0
      case 3:
        return formData.budget.min && formData.budget.max &&
               formData.timeline.applicationDeadline &&
               formData.timeline.startDate && formData.timeline.endDate
      default:
        return true
    }
  }

  const nextStep = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length))
    } else {
      setError("Please fill in all required fields before proceeding")
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
    setError("")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setSuccess("")
    setError("")

    try {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          status: "OPEN",
          budgetMin: parseFloat(formData.budget.min),
          budgetMax: parseFloat(formData.budget.max),
          influencerCount: parseInt(formData.influencerCount),
          requirements: JSON.stringify(formData.requirements),
          deliverables: JSON.stringify(formData.requirements.deliverables),
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess("Campaign created successfully!")
        setTimeout(() => {
          router.push(`/dashboard/campaigns/${data.id}`)
        }, 2000)
      } else {
        setError(data.message || "Failed to create campaign")
      }
    } catch (error) {
      setError("An error occurred while creating campaign")
    } finally {
      setIsLoading(false)
    }
  }

  const saveDraft = async () => {
    setIsSavingDraft(true)
    try {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          status: "DRAFT",
          budgetMin: formData.budget.min ? parseFloat(formData.budget.min) : null,
          budgetMax: formData.budget.max ? parseFloat(formData.budget.max) : null,
          influencerCount: formData.influencerCount ? parseInt(formData.influencerCount) : null,
          requirements: JSON.stringify(formData.requirements),
          deliverables: JSON.stringify(formData.requirements.deliverables),
        }),
      })

      if (response.ok) {
        setSuccess("Draft saved successfully!")
        setTimeout(() => setSuccess(""), 3000)
      } else {
        setError("Failed to save draft")
      }
    } catch (error) {
      setError("An error occurred while saving draft")
    } finally {
      setIsSavingDraft(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Overview</CardTitle>
                <CardDescription>Basic information about your campaign</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="title">Campaign Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => updateFormData('title', '', e.target.value)}
                    placeholder="e.g., Summer Collection Launch"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Campaign Description *</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => updateFormData('description', '', e.target.value)}
                    rows={4}
                    placeholder="Describe your campaign goals, brand values, and what makes this collaboration special"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <Select value={formData.category} onValueChange={(value) => updateFormData('category', '', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(category => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="contentType">Content Type *</Label>
                    <Select value={formData.contentType} onValueChange={(value) => updateFormData('contentType', '', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select content type" />
                      </SelectTrigger>
                      <SelectContent>
                        {contentTypes.map(type => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="platform">Primary Platform *</Label>
                    <Select value={formData.platform} onValueChange={(value) => updateFormData('platform', '', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select platform" />
                      </SelectTrigger>
                      <SelectContent>
                        {platforms.map(platform => (
                          <SelectItem key={platform} value={platform}>{platform}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="influencerCount">Number of Influencers</Label>
                    <Select value={formData.influencerCount} onValueChange={(value) => updateFormData('influencerCount', '', value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select number" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1,2,3,5,10,20].map(num => (
                          <SelectItem key={num} value={num.toString()}>{num} {num === 1 ? 'Influencer' : 'Influencers'}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Target Audience</CardTitle>
                <CardDescription>Describe your ideal audience demographics</CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  <Label htmlFor="targetAudience">Target Audience *</Label>
                  <Textarea
                    id="targetAudience"
                    value={formData.requirements.targetAudience}
                    onChange={(e) => updateFormData('requirements', 'targetAudience', e.target.value)}
                    rows={3}
                    placeholder="e.g., Women aged 18-35, urban areas, interested in sustainable fashion, Instagram users"
                    required
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Content Guidelines</CardTitle>
                <CardDescription>Specific requirements and creative direction</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="contentGuidelines">Content Guidelines *</Label>
                  <Textarea
                    id="contentGuidelines"
                    value={formData.requirements.contentGuidelines}
                    onChange={(e) => updateFormData('requirements', 'contentGuidelines', e.target.value)}
                    rows={4}
                    placeholder="Describe the tone, style, messaging, and any specific elements to include or avoid"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="technicalSpecs">Technical Specifications</Label>
                  <Textarea
                    id="technicalSpecs"
                    value={formData.requirements.technicalSpecs}
                    onChange={(e) => updateFormData('requirements', 'technicalSpecs', e.target.value)}
                    rows={3}
                    placeholder="e.g., High-resolution photos (4K), Vertical video (9:16), Include brand logo, No filters"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Deliverables *</CardTitle>
                <CardDescription>What influencers need to create and submit</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {formData.requirements.deliverables.map((deliverable, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center">
                        {deliverable}
                        <button
                          type="button"
                          onClick={() => removeDeliverable(deliverable)}
                          className="ml-2 text-red-500 hover:text-red-700"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Select value={newDeliverable} onValueChange={setNewDeliverable}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Add deliverable" />
                      </SelectTrigger>
                      <SelectContent>
                        {deliverableOptions.map(option => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" onClick={addDeliverable} variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Budget & Payment</CardTitle>
                <CardDescription>Set compensation details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="budgetMin">Minimum Budget ($) *</Label>
                    <Input
                      id="budgetMin"
                      type="number"
                      value={formData.budget.min}
                      onChange={(e) => updateFormData('budget', 'min', e.target.value)}
                      placeholder="500"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="budgetMax">Maximum Budget ($) *</Label>
                    <Input
                      id="budgetMax"
                      type="number"
                      value={formData.budget.max}
                      onChange={(e) => updateFormData('budget', 'max', e.target.value)}
                      placeholder="2000"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="paymentType">Payment Type</Label>
                  <Select value={formData.budget.paymentType} onValueChange={(value) => updateFormData('budget', 'paymentType', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment type" />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Campaign Timeline</CardTitle>
                <CardDescription>Schedule and deadlines</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="applicationDeadline">Application Deadline *</Label>
                    <Input
                      id="applicationDeadline"
                      type="date"
                      value={formData.timeline.applicationDeadline}
                      onChange={(e) => updateFormData('timeline', 'applicationDeadline', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="startDate">Campaign Start Date *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={formData.timeline.startDate}
                      onChange={(e) => updateFormData('timeline', 'startDate', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">Campaign End Date *</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={formData.timeline.endDate}
                      onChange={(e) => updateFormData('timeline', 'endDate', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isRemote"
                      checked={formData.isRemote}
                      onCheckedChange={(checked) => updateFormData('isRemote', '', checked)}
                    />
                    <Label htmlFor="isRemote">Remote collaboration</Label>
                  </div>

                  <div>
                    <Label htmlFor="location">Location (if not remote)</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => updateFormData('location', '', e.target.value)}
                      placeholder="City, State/Country"
                      disabled={formData.isRemote}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Review</CardTitle>
                <CardDescription>Review your campaign details before launching</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-2">Campaign Details</h4>
                      <div className="space-y-2 text-sm">
                        <p><span className="font-medium">Title:</span> {formData.title}</p>
                        <p><span className="font-medium">Category:</span> {formData.category}</p>
                        <p><span className="font-medium">Content Type:</span> {formData.contentType}</p>
                        <p><span className="font-medium">Platform:</span> {formData.platform}</p>
                        <p><span className="font-medium">Influencers:</span> {formData.influencerCount}</p>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold mb-2">Budget & Timeline</h4>
                      <div className="space-y-2 text-sm">
                        <p><span className="font-medium">Budget Range:</span> ${formData.budget.min} - ${formData.budget.max}</p>
                        <p><span className="font-medium">Payment Type:</span> {paymentTypes.find(p => p.value === formData.budget.paymentType)?.label}</p>
                        <p><span className="font-medium">Application Deadline:</span> {formData.timeline.applicationDeadline}</p>
                        <p><span className="font-medium">Campaign Period:</span> {formData.timeline.startDate} to {formData.timeline.endDate}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Deliverables</h4>
                    <div className="flex flex-wrap gap-2">
                      {formData.requirements.deliverables.map((deliverable, index) => (
                        <Badge key={index} variant="outline">{deliverable}</Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Campaign Description</h4>
                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                      {formData.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Create New Campaign</h1>
            <p className="text-gray-600">Launch your influencer marketing campaign</p>
          </div>
        </div>

        {currentStep < steps.length && (
          <Button
            variant="outline"
            onClick={saveDraft}
            disabled={isSavingDraft}
          >
            {isSavingDraft ? "Saving..." : "Save Draft"}
          </Button>
        )}
      </div>

      {success && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Progress Steps */}
      <div className="flex items-center justify-center space-x-4">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center">
            <div
              className={cn(
                "flex items-center justify-center w-10 h-10 rounded-full border-2 font-medium text-sm",
                currentStep === step.id
                  ? "border-blue-600 bg-blue-600 text-white"
                  : currentStep > step.id
                  ? "border-green-600 bg-green-600 text-white"
                  : "border-gray-300 bg-white text-gray-500"
              )}
            >
              {currentStep > step.id ? "✓" : step.id}
            </div>
            <div className="ml-3 hidden md:block">
              <p className="text-sm font-medium">{step.title}</p>
              <p className="text-xs text-gray-500">{step.description}</p>
            </div>
            {index < steps.length - 1 && (
              <div className={cn(
                "w-8 h-1 mx-4",
                currentStep > step.id ? "bg-green-600" : "bg-gray-300"
              )} />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        {renderStepContent()}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 1}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          {currentStep === steps.length ? (
            <div className="flex space-x-3">
              <Button type="button" variant="outline" onClick={saveDraft}>
                Save as Draft
              </Button>
              <Button type="submit" disabled={isLoading}>
                <Eye className="h-4 w-4 mr-2" />
                {isLoading ? "Creating..." : "Launch Campaign"}
              </Button>
            </div>
          ) : (
            <Button type="button" onClick={nextStep}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}