"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Upload, Building, MapPin, Globe, Users, Mail, Phone, Save, Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"

export default function SettingsPage() {
  const { data: session } = useSession()
  const isBrand = session?.user?.role === "BRAND"
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")

  const [profileData, setProfileData] = useState({
    // Brand Profile
    companyName: "",
    companyDescription: "",
    website: "",
    industry: "",
    companySize: "",
    logo: "",
    contactEmail: "",
    phone: "",
    address: "",
    linkedinUrl: "",
    twitterUrl: "",
    facebookUrl: "",

    // Influencer Profile
    firstName: "",
    lastName: "",
    bio: "",
    profileImage: "",
    location: "",
    languages: [] as string[],
    timezone: "",
    website: "",
    contactEmail: "",
    phone: "",
    niches: [] as string[],
    platforms: [] as Array<{
      platform: string
      handle: string
      followerCount: number
      engagementRate: number
    }>,
    equipment: [] as string[],

    // Common
    isPublic: true,
  })

  const [newLanguage, setNewLanguage] = useState("")
  const [newPlatform, setNewPlatform] = useState("")
  const [newPlatformHandle, setNewPlatformHandle] = useState("")
  const [newPlatformFollowers, setNewPlatformFollowers] = useState("")
  const [newPlatformEngagement, setNewPlatformEngagement] = useState("")
  const [newEquipment, setNewEquipment] = useState("")
  const [newNiche, setNewNiche] = useState("")

  useEffect(() => {
    fetchProfile()
  }, [session])

  const fetchProfile = async () => {
    if (!session?.user?.id) return

    try {
      const response = await fetch(`/api/${isBrand ? 'brands' : 'influencers'}/profile`)
      if (response.ok) {
        const data = await response.json()
        setProfileData(prev => ({ ...prev, ...data }))
      }
    } catch (error) {
      console.error("Error fetching profile:", error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setSuccess("")
    setError("")

    try {
      const response = await fetch(`/api/${isBrand ? 'brands' : 'influencers'}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess("Profile updated successfully!")
      } else {
        setError(data.message || "Failed to update profile")
      }
    } catch (error) {
      setError("An error occurred while updating profile")
    } finally {
      setIsLoading(false)
    }
  }

  const addLanguage = () => {
    if (newLanguage && !profileData.languages.includes(newLanguage)) {
      setProfileData(prev => ({
        ...prev,
        languages: [...prev.languages, newLanguage]
      }))
      setNewLanguage("")
    }
  }

  const removeLanguage = (lang: string) => {
    setProfileData(prev => ({
      ...prev,
      languages: prev.languages.filter(l => l !== lang)
    }))
  }

  const addNiche = () => {
    if (newNiche && !profileData.niches.includes(newNiche)) {
      setProfileData(prev => ({
        ...prev,
        niches: [...prev.niches, newNiche]
      }))
      setNewNiche("")
    }
  }

  const removeNiche = (niche: string) => {
    setProfileData(prev => ({
      ...prev,
      niches: prev.niches.filter(n => n !== niche)
    }))
  }

  const addPlatform = () => {
    if (newPlatform && newPlatformHandle) {
      setProfileData(prev => ({
        ...prev,
        platforms: [...prev.platforms, {
          platform: newPlatform,
          handle: newPlatformHandle,
          followerCount: parseInt(newPlatformFollowers) || 0,
          engagementRate: parseFloat(newPlatformEngagement) || 0
        }]
      }))
      setNewPlatform("")
      setNewPlatformHandle("")
      setNewPlatformFollowers("")
      setNewPlatformEngagement("")
    }
  }

  const removePlatform = (index: number) => {
    setProfileData(prev => ({
      ...prev,
      platforms: prev.platforms.filter((_, i) => i !== index)
    }))
  }

  const addEquipment = () => {
    if (newEquipment && !profileData.equipment.includes(newEquipment)) {
      setProfileData(prev => ({
        ...prev,
        equipment: [...prev.equipment, newEquipment]
      }))
      setNewEquipment("")
    }
  }

  const removeEquipment = (equipment: string) => {
    setProfileData(prev => ({
      ...prev,
      equipment: prev.equipment.filter(e => e !== equipment)
    }))
  }

  const industries = [
    "Technology", "Fashion", "Beauty", "Food & Beverage", "Travel",
    "Fitness", "Healthcare", "Finance", "Education", "Entertainment",
    "Automotive", "Real Estate", "Retail", "Sports", "Gaming"
  ]

  const companySizes = [
    "1-10 employees", "11-50 employees", "51-200 employees",
    "201-500 employees", "501-1000 employees", "1000+ employees"
  ]

  const platformOptions = [
    "Instagram", "TikTok", "YouTube", "Twitter", "LinkedIn",
    "Facebook", "Twitch", "Pinterest", "Snapchat"
  ]

  const nicheOptions = [
    "Fashion", "Beauty", "Lifestyle", "Travel", "Food", "Fitness",
    "Technology", "Gaming", "Photography", "Art", "Music", "Comedy",
    "Education", "Business", "Finance", "Health", "Parenting", "Pets"
  ]

  const equipmentOptions = [
    "DSLR Camera", "Mirrorless Camera", "Smartphone", "Lighting Kit",
    "Tripod", "Microphone", "Video Editing Software", "Ring Light",
    "Green Screen", "Drone", "Gimbal", "Audio Interface"
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {isBrand ? "Brand Profile" : "Influencer Profile"}
          </h1>
          <p className="text-gray-600">
            Manage your {isBrand ? "company" : "personal"} information
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Avatar className="h-12 w-12">
            <AvatarImage src={isBrand ? profileData.logo : profileData.profileImage} />
            <AvatarFallback>
              {isBrand ? profileData.companyName.charAt(0) : profileData.firstName?.charAt(0)}
            </AvatarFallback>
          </Avatar>
        </div>
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

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building className="h-5 w-5 mr-2" />
              {isBrand ? "Company Information" : "Personal Information"}
            </CardTitle>
            <CardDescription>
              {isBrand
                ? "Tell brands about your company and what you do"
                : "Tell brands about yourself and your content style"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isBrand ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="companyName">Company Name *</Label>
                    <Input
                      id="companyName"
                      value={profileData.companyName}
                      onChange={(e) => setProfileData(prev => ({ ...prev, companyName: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="industry">Industry *</Label>
                    <Select value={profileData.industry} onValueChange={(value) => setProfileData(prev => ({ ...prev, industry: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {industries.map(industry => (
                          <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      type="url"
                      value={profileData.website}
                      onChange={(e) => setProfileData(prev => ({ ...prev, website: e.target.value }))}
                      placeholder="https://yourcompany.com"
                    />
                  </div>
                  <div>
                    <Label htmlFor="companySize">Company Size</Label>
                    <Select value={profileData.companySize} onValueChange={(value) => setProfileData(prev => ({ ...prev, companySize: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select company size" />
                      </SelectTrigger>
                      <SelectContent>
                        {companySizes.map(size => (
                          <SelectItem key={size} value={size}>{size}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={profileData.firstName}
                    onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={profileData.lastName}
                    onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <Label htmlFor={isBrand ? "companyDescription" : "bio"}>
                {isBrand ? "Company Description" : "Bio"}
              </Label>
              <Textarea
                id={isBrand ? "companyDescription" : "bio"}
                value={isBrand ? profileData.companyDescription : profileData.bio}
                onChange={(e) => setProfileData(prev => ({
                  ...prev,
                  [isBrand ? "companyDescription" : "bio"]: e.target.value
                }))}
                rows={4}
                placeholder={isBrand
                  ? "Describe your company, mission, and what makes you unique"
                  : "Tell brands about your content style and what makes your content special"
                }
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contactEmail">Contact Email *</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={profileData.contactEmail}
                  onChange={(e) => setProfileData(prev => ({ ...prev, contactEmail: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="address" className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {isBrand ? "Company Address" : "Location"}
                </Label>
                <Input
                  id="address"
                  value={profileData.address}
                  onChange={(e) => setProfileData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder={isBrand ? "123 Business St, City, State" : "City, Country"}
                />
              </div>
              {!isBrand && (
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    value={profileData.timezone}
                    onChange={(e) => setProfileData(prev => ({ ...prev, timezone: e.target.value }))}
                    placeholder="UTC-5 (EST)"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Social Media Links */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Globe className="h-5 w-5 mr-2" />
              Social Media Links
            </CardTitle>
            <CardDescription>
              Link your {isBrand ? "company's" : "personal"} social media profiles
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
                <Input
                  id="linkedinUrl"
                  type="url"
                  value={profileData.linkedinUrl}
                  onChange={(e) => setProfileData(prev => ({ ...prev, linkedinUrl: e.target.value }))}
                  placeholder="https://linkedin.com/in/yourprofile"
                />
              </div>
              <div>
                <Label htmlFor="twitterUrl">Twitter URL</Label>
                <Input
                  id="twitterUrl"
                  type="url"
                  value={profileData.twitterUrl}
                  onChange={(e) => setProfileData(prev => ({ ...prev, twitterUrl: e.target.value }))}
                  placeholder="https://twitter.com/yourhandle"
                />
              </div>
            </div>
            {isBrand && (
              <div>
                <Label htmlFor="facebookUrl">Facebook URL</Label>
                <Input
                  id="facebookUrl"
                  type="url"
                  value={profileData.facebookUrl}
                  onChange={(e) => setProfileData(prev => ({ ...prev, facebookUrl: e.target.value }))}
                  placeholder="https://facebook.com/yourcompany"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Influencer Specific Fields */}
        {!isBrand && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Platforms & Metrics
                </CardTitle>
                <CardDescription>
                  Add your social media platforms and performance metrics
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Your Platforms</Label>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {profileData.platforms.map((platform, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center">
                        {platform.platform} (@{platform.handle})
                        <button
                          type="button"
                          onClick={() => removePlatform(index)}
                          className="ml-2 text-red-500 hover:text-red-700"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <Select value={newPlatform} onValueChange={setNewPlatform}>
                      <SelectTrigger>
                        <SelectValue placeholder="Platform" />
                      </SelectTrigger>
                      <SelectContent>
                        {platformOptions.map(platform => (
                          <SelectItem key={platform} value={platform}>{platform}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Handle"
                      value={newPlatformHandle}
                      onChange={(e) => setNewPlatformHandle(e.target.value)}
                    />
                    <Input
                      type="number"
                      placeholder="Followers"
                      value={newPlatformFollowers}
                      onChange={(e) => setNewPlatformFollowers(e.target.value)}
                    />
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="Engagement %"
                      value={newPlatformEngagement}
                      onChange={(e) => setNewPlatformEngagement(e.target.value)}
                    />
                  </div>
                  <Button type="button" onClick={addPlatform} variant="outline" size="sm">
                    Add Platform
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Content Niches</CardTitle>
                <CardDescription>
                  Select the content categories you specialize in
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {profileData.niches.map((niche, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center">
                        {niche}
                        <button
                          type="button"
                          onClick={() => removeNiche(niche)}
                          className="ml-2 text-red-500 hover:text-red-700"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Select value={newNiche} onValueChange={setNewNiche}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select niche" />
                      </SelectTrigger>
                      <SelectContent>
                        {nicheOptions.map(niche => (
                          <SelectItem key={niche} value={niche}>{niche}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" onClick={addNiche} variant="outline" size="sm">
                      Add Niche
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Equipment & Capabilities</CardTitle>
                <CardDescription>
                  List your equipment and production capabilities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {profileData.equipment.map((item, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center">
                        {item}
                        <button
                          type="button"
                          onClick={() => removeEquipment(item)}
                          className="ml-2 text-red-500 hover:text-red-700"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Select value={newEquipment} onValueChange={setNewEquipment}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select equipment" />
                      </SelectTrigger>
                      <SelectContent>
                        {equipmentOptions.map(equipment => (
                          <SelectItem key={equipment} value={equipment}>{equipment}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" onClick={addEquipment} variant="outline" size="sm">
                      Add Equipment
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Languages</CardTitle>
                <CardDescription>
                  Languages you can create content in
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {profileData.languages.map((lang, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center">
                        {lang}
                        <button
                          type="button"
                          onClick={() => removeLanguage(lang)}
                          className="ml-2 text-red-500 hover:text-red-700"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder="Add language (e.g., English, Spanish)"
                      value={newLanguage}
                      onChange={(e) => setNewLanguage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addLanguage())}
                    />
                    <Button type="button" onClick={addLanguage} variant="outline" size="sm">
                      Add
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  )
}