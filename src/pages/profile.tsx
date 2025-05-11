'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import UserBanner from '@/components/UserBanner'
import RequestRoleForm from '@/components/RequestRoleForm'
import withAuth from '@/components/withAuth'
import { getCurrentUser } from '@/lib/auth'

function ProfilePage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await getCurrentUser()
        setUser(userData)
      } catch (error) {
        console.error('Error loading user:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [])

  if (loading) return <div className="p-8">Loading...</div>
  if (!user) return <div className="p-8">User not found. Please log in again.</div>

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <UserBanner email={user.email || ''} roles={user.roles || []} />
      
      <h1 className="text-2xl font-bold mt-8 mb-6">Your Profile</h1>
      
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Account Information</h2>
        <div className="grid gap-4">
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-medium">{user.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">User ID</p>
            <p className="font-mono text-sm">{user.id}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Current Roles</p>
            {user.roles && user.roles.length > 0 ? (
              <div className="flex flex-wrap gap-2 mt-1">
                {user.roles.map((role: string) => (
                  <span 
                    key={role} 
                    className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm"
                  >
                    {role}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 italic">No roles assigned</p>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-8">
        <RequestRoleForm userRoles={user.roles || []} pendingRoles={user.pending_roles || []} />
      </div>
    </div>
  )
}

export default withAuth(ProfilePage) 