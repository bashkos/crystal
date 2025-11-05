"use client"

import { useSession } from "next-auth/react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import {
  Home,
  Users,
  Briefcase,
  FileText,
  DollarSign,
  MessageSquare,
  Settings,
  TrendingUp
} from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Campaigns", href: "/dashboard/campaigns", icon: Briefcase },
  { name: "Applications", href: "/dashboard/applications", icon: FileText },
  { name: "Messages", href: "/dashboard/messages", icon: MessageSquare },
  { name: "Payments", href: "/dashboard/payments", icon: DollarSign },
  { name: "Analytics", href: "/dashboard/analytics", icon: TrendingUp },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
]

const brandNavigation = [
  { name: "Find Influencers", href: "/dashboard/influencers", icon: Users },
  ...navigation,
]

const influencerNavigation = [
  { name: "Browse Campaigns", href: "/dashboard/campaigns", icon: Briefcase },
  { name: "My Applications", href: "/dashboard/applications", icon: FileText },
  ...navigation.slice(2),
]

export function Sidebar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const isBrand = session?.user?.role === "BRAND"
  const navigationItems = isBrand ? brandNavigation : influencerNavigation

  return (
    <div className="w-64 bg-white shadow-sm border-r min-h-screen">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-900">
          {isBrand ? "Brand Dashboard" : "Influencer Dashboard"}
        </h2>
        <p className="text-sm text-gray-500">
          {isBrand ? "Manage your campaigns" : "Find your next collaboration"}
        </p>
      </div>

      <nav className="px-3">
        <ul className="space-y-1">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <item.icon
                    className={cn(
                      "mr-3 h-5 w-5",
                      isActive ? "text-blue-700" : "text-gray-400"
                    )}
                  />
                  {item.name}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </div>
  )
}