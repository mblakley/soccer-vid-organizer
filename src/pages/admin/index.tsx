'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import UserBanner from '@/components/UserBanner'
import { getCurrentUser, getRedirectPath, hasRole } from '@/lib/auth'

export default function AdminDashboard() {
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
        
        if (!hasRole(user.roles, ['admin'])) {
          console.log("User is not an admin, redirecting to appropriate page")
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
      <UserBanner email={userEmail} roles={userRoles} />
      <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
      <ul className="list-disc list-inside space-y-2">
        <li><a href="/admin/roles" className="text-blue-600 underline">Review Role Requests</a></li>
        <li><a href="/admin/users" className="text-blue-600 underline">Manage Users</a></li>
      </ul>
    </div>
  )
}
