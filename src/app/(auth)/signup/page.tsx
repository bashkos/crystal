"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Chrome, Linkedin, Instagram, Mail, User, Building } from "lucide-react"

export default function SignUpPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultRole = searchParams.get("role") || ""
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    role: defaultRole,
    firstName: "",
    lastName: "",
    companyName: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [step, setStep] = useState(defaultRole ? 2 : 1) // Step 1: Choose role, Step 2: Fill form

  const handleRoleSelection = (role: string) => {
    setFormData(prev => ({ ...prev, role }))
    setStep(2)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (response.ok) {
        // Auto sign in after successful registration
        await signIn("credentials", {
          email: formData.email,
          password: formData.password,
          callbackUrl: "/dashboard",
        })
      } else {
        setError(data.message || "An error occurred during registration")
      }
    } catch (error) {
      setError("An error occurred during registration")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOAuthSignUp = async (provider: string) => {
    setIsLoading(true)
    try {
      await signIn(provider, { callbackUrl: "/dashboard" })
    } catch (error) {
      setError("An error occurred during sign up")
      setIsLoading(false)
    }
  }

  if (step === 1) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Join Crystal</h2>
          <p className="mt-2 text-sm text-gray-600">
            Choose how you want to use our platform
          </p>
        </div>

        <div className="space-y-4">
          <Button
            variant="outline"
            onClick={() => handleRoleSelection("brand")}
            className="w-full h-auto p-6 flex flex-col items-start space-y-2"
          >
            <div className="flex items-center space-x-2">
              <Building className="h-6 w-6 text-blue-600" />
              <span className="text-lg font-semibold">I'm a Brand</span>
            </div>
            <p className="text-sm text-gray-600 text-left">
              Create campaigns, hire influencers, and manage UGC content
            </p>
          </Button>

          <Button
            variant="outline"
            onClick={() => handleRoleSelection("influencer")}
            className="w-full h-auto p-6 flex flex-col items-start space-y-2"
          >
            <div className="flex items-center space-x-2">
              <User className="h-6 w-6 text-purple-600" />
              <span className="text-lg font-semibold">I'm an Influencer</span>
            </div>
            <p className="text-sm text-gray-600 text-left">
              Find campaigns, submit content, and grow your influence
            </p>
          </Button>
        </div>

        {/* OAuth Providers */}
        <div className="space-y-3">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or sign up with</span>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => handleOAuthSignUp("google")}
            disabled={isLoading}
            className="w-full"
          >
            <Chrome className="h-4 w-4 mr-2" />
            Continue with Google
          </Button>

          <Button
            variant="outline"
            onClick={() => handleOAuthSignUp("linkedin")}
            disabled={isLoading}
            className="w-full"
          >
            <Linkedin className="h-4 w-4 mr-2" />
            Continue with LinkedIn
          </Button>

          <Button
            variant="outline"
            onClick={() => handleOAuthSignUp("instagram")}
            disabled={isLoading}
            className="w-full"
          >
            <Instagram className="h-4 w-4 mr-2" />
            Continue with Instagram
          </Button>
        </div>

        <p className="text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link href="/auth/signin" className="font-medium text-blue-600 hover:text-blue-500">
            Sign in
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Create your {formData.role === "brand" ? "brand" : "influencer"} account
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Already have an account?{" "}
          <Link href="/auth/signin" className="font-medium text-blue-600 hover:text-blue-500">
            Sign in
          </Link>
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div>
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={formData.email}
              onChange={handleInputChange}
              disabled={isLoading}
            />
          </div>

          {formData.role === "brand" ? (
            <div>
              <Label htmlFor="companyName">Company name</Label>
              <Input
                id="companyName"
                name="companyName"
                type="text"
                required
                value={formData.companyName}
                onChange={handleInputChange}
                disabled={isLoading}
              />
            </div>
          ) : (
            <>
              <div>
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </div>

              <div>
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={handleInputChange}
                  disabled={isLoading}
                />
              </div>
            </>
          )}

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleInputChange}
              disabled={isLoading}
            />
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              value={formData.confirmPassword}
              onChange={handleInputChange}
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="flex space-x-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setStep(1)}
            disabled={isLoading}
            className="flex-1"
          >
            Back
          </Button>
          <Button type="submit" disabled={isLoading} className="flex-1">
            {isLoading ? "Creating account..." : "Create account"}
          </Button>
        </div>
      </form>
    </div>
  )
}