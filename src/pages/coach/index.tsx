'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabaseClient'
import UserBanner from '@/components/UserBanner'
import { getCurrentUser, hasRole, getRedirectPath } from '@/lib/auth'

export default function CoachDashboard() {
  const router = useRouter()
  const [userRoles, setUserRoles] = useState<string[]>([])
  const [userEmail, setUserEmail] = useState('')
  const [unrepliedCount, setUnrepliedCount] = useState(0)
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
        
        if (!hasRole(user.roles, ['coach', 'admin'])) {
          console.log("User is not a coach, redirecting to appropriate page")
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

  useEffect(() => {
    if (!loading) {
      const fetchUnrepliedComments = async () => {
        const { data } = await supabase
          .from('comments')
          .select('id', { count: 'exact' })
          .is('reply_to', null)
        setUnrepliedCount(data?.length || 0)
      }
      fetchUnrepliedComments()
    }
  }, [loading])

  if (loading) return <p className="p-8">Loading...</p>

  return (
    <div className="p-8">
      <UserBanner email={userEmail} roles={userRoles} />
      <h1 className="text-2xl font-bold mb-4">Coach Dashboard</h1>
      <ul className="list-disc list-inside space-y-2">
        <li><a href="/coach/clips" className="text-blue-600 underline">Edit Clips</a></li>
        <li>Unreplied Comments: {unrepliedCount}</li>
      </ul>
    </div>
  )
}
