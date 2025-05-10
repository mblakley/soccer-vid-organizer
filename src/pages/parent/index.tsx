'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import UserBanner from '@/components/UserBanner'
import { getCurrentUser, hasRole, getRedirectPath } from '@/lib/auth'

export default function ParentDashboard() {
  const router = useRouter()
  const [userRoles, setUserRoles] = useState<string[]>([])
  const [userEmail, setUserEmail] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser()
        
        if (!user) {
          console.log("No user found, redirecting to login")
          router.push('/login')
          return
        }
        
        if (!hasRole(user.roles, ['parent', 'admin'])) {
          console.log("User is not a parent, redirecting to appropriate page")
          router.push(getRedirectPath(user.roles))
          return
        }

        setUserRoles(user.roles || [])
        setUserEmail(user.email || '')
        setLoading(false)
      } catch (error) {
        console.error("Error checking authentication:", error)
        router.push('/login')
      }
    }
    
    checkAuth()
  }, [router])

  if (loading) return <p className="p-8">Loading...</p>

  return (
    <div className="p-8">
      <UserBanner email={userEmail} roles={userRoles  } />
      <h1 className="text-2xl font-bold mb-4">Parent Dashboard</h1>
      <p>Welcome to your parent dashboard. Here you can monitor your child's progress.</p>
      <div className="mt-4">
        <h2 className="text-xl font-semibold">Your Child's Recent Clips</h2>
        <p className="text-gray-500 mt-2">No clips available yet.</p>
      </div>
    </div>
  )
} 