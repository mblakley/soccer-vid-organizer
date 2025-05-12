'use client'
import { useEffect, useState } from 'react'
import { withAdminAuth } from '@/components/auth'
import { useTheme } from '@/contexts/ThemeContext'

function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { isDarkMode } = useTheme()

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/admin/users-with-roles')
        if (response.ok) {
          const usersData = await response.json()
          setUsers(usersData)
        } else {
          console.error('Error fetching users:', response.statusText)
        }
      } catch (error) {
        console.error('Error fetching users:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
  }, [])

  const toggleUserStatus = async (id: string, disabled: boolean) => {
    try {
      const response = await fetch('/api/admin/disable-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, disabled })
      })

      if (!response.ok) {
        throw new Error('Failed to update user status')
      }

      // Refresh user list
      const refreshResponse = await fetch('/api/admin/users-with-roles')
      if (refreshResponse.ok) {
        const usersData = await refreshResponse.json()
        setUsers(usersData)
      }
    } catch (error) {
      console.error('Error updating user status:', error)
      alert('Failed to update user status')
    }
  }

  const removeUser = async (id: string) => {
    if (!confirm('Are you sure you want to remove this user? This action cannot be undone.')) {
      return
    }

    try {
      const response = await fetch('/api/admin/remove-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })

      if (!response.ok) {
        throw new Error('Failed to remove user')
      }

      // Refresh user list
      const refreshResponse = await fetch('/api/admin/users-with-roles')
      if (refreshResponse.ok) {
        const usersData = await refreshResponse.json()
        setUsers(usersData)
      }
    } catch (error) {
      console.error('Error removing user:', error)
      alert('Failed to remove user')
    }
  }

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="p-8">
      {users.length === 0 ? (
        <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'} p-4 rounded`}>
          <p>No users found.</p>
        </div>
      ) : (
        <div>
          <h2 className="text-xl font-semibold mb-2">Users</h2>
          <ul className="space-y-4">
            {users.map(user => (
              <li key={user.id} className={`border p-4 rounded shadow-sm ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
                <div className="flex justify-between">
                  <div>
                    <p><strong>Email:</strong> {user.email}</p>
                    <p><strong>Status:</strong> {user.user_metadata?.disabled ? 'Disabled' : 'Active'}</p>
                    <p><strong>Admin:</strong> {user.is_admin ? 'Yes' : 'No'}</p>
                    <p><strong>Created:</strong> {new Date(user.created_at).toLocaleDateString()}</p>
                    <p><strong>Last Sign In:</strong> {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'}</p>
                  </div>
                  <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <p style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}>User ID: {user.id}</p>
                  </div>
                </div>
                
                <div className="mt-4 flex gap-2">
                  <button
                    className={`px-4 py-2 rounded ${
                      user.user_metadata?.disabled
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-yellow-600 hover:bg-yellow-700'
                    } text-white`}
                    onClick={() => toggleUserStatus(user.id, !user.user_metadata?.disabled)}
                  >
                    {user.user_metadata?.disabled ? 'Enable User' : 'Disable User'}
                  </button>
                  <button
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                    onClick={() => removeUser(user.id)}
                  >
                    Remove User
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default withAdminAuth(
  UsersPage, 
  'User Management'
) 