import { useState, useEffect } from 'react'
import withAuth from '@/components/withAuth'
import { supabase } from '@/lib/supabaseClient'

function AdminUsersPage({ user }: { user: any }) {
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Fetch pending users from the API
        let pendingUsers = []
        try {
          const pendingResponse = await fetch('/api/admin/pending-users')
          if (pendingResponse.ok) {
            pendingUsers = await pendingResponse.json()
          } else {
            console.error('Error fetching pending users:', await pendingResponse.text())
          }
        } catch (err) {
          console.error('Error in pending users fetch:', err)
        }
        
        // Fetch users with roles from the API
        let usersWithRoles = []
        try {
          const rolesResponse = await fetch('/api/admin/users-with-roles')
          if (rolesResponse.ok) {
            usersWithRoles = await rolesResponse.json()
          } else {
            console.error('Error fetching users with roles:', await rolesResponse.text())
          }
        } catch (err) {
          console.error('Error in users with roles fetch:', err)
        }
        
        // Combine the user lists
        setAllUsers([...pendingUsers, ...usersWithRoles])
      } catch (error) {
        console.error('Error fetching users:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchUsers()
  }, [])

  if (loading) return <div className="p-8">Loading users...</div>

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">User Management</h1>
      
      <div className="mt-4">
        <h2 className="text-xl font-semibold mb-2">All Users ({allUsers.length})</h2>
        <ul className="space-y-2">
          {allUsers.map((u) => (
            <li key={u.id} className="border p-2 rounded">
              <div className="flex justify-between">
                <div>
                  <p className="font-medium">{u.email}</p>
                  <p className="text-sm">Role: {u.role || 'None'}</p>
                </div>
                <div className="text-sm text-gray-500">
                  ID: {u.id.substring(0, 8)}...
                </div>
              </div>
            </li>
          ))}
        </ul>
        
        {allUsers.length === 0 && (
          <p className="text-gray-500">No users found.</p>
        )}
      </div>
    </div>
  )
}

export default withAuth(AdminUsersPage, ['admin']) 