'use client'
import { useEffect, useState } from 'react'
import { X as LucideX } from 'lucide-react'
import { withAdminAuth } from '@/components/auth'
import { useTheme } from '@/contexts/ThemeContext'
import { toast } from 'react-toastify'

function RoleApprovalPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null); // General error state
  const { isDarkMode } = useTheme()

  useEffect(() => {
    const fetchUsers = async () => {
      setError(null); // Clear error on fetch
      setLoading(true);
      try {
        // Fetch users with admin status
        const response = await fetch('/api/admin/users-with-roles')
        if (response.ok) {
          const usersData = await response.json()
          setUsers(usersData)
        } else {
          console.error('Error fetching users:', response.statusText);
          setError('Failed to fetch user roles. Please try again.');
        }
      } catch (error: any) {
        console.error('Error fetching users:', error);
        setError(error.message || 'An error occurred while fetching user roles.');
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
  }, [])

  const updateAdminStatus = async (id: string, isAdmin: boolean) => {
    setError(null); // Clear previous error
    try {
      const response = await fetch(`/api/admin/update-user-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isAdmin })
      })
      
      if (!response.ok) {
        // throw new Error(`Failed to update admin status: ${response.statusText}`)
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || 'Failed to update admin status.');
        return;
      }
      toast.success('Admin status updated successfully.');
      // Refresh the user list
      const refreshResponse = await fetch('/api/admin/users-with-roles')
      if (refreshResponse.ok) {
        const usersData = await refreshResponse.json()
        setUsers(usersData)
      } else {
        setError('Admin status updated, but failed to refresh user list.');
      }
    } catch (error: any) {
      console.error('Error updating admin status:', error)
      // toast.error('Failed to update admin status')
      setError(error.message || 'An unexpected error occurred while updating admin status.');
    }
  }

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="p-8">
      {error && (
        <div className={`mb-4 p-4 text-sm rounded ${isDarkMode ? 'bg-red-800 text-red-200' : 'bg-red-100 text-red-700'}`} role="alert">
          <span className="font-medium">Error:</span> {error}
        </div>
      )}
      {users.length === 0 && !loading && !error ? (
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
                    <p><strong>Admin Status:</strong></p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {user.is_admin ? (
                        <span className={`inline-flex items-center px-2 py-1 rounded text-sm font-medium ${
                          isDarkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'
                        }`}>
                          Admin
                          <button
                            className={`ml-2 ${isDarkMode ? 'text-red-400 hover:bg-red-900' : 'text-red-600 hover:bg-red-100'} rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-red-400`}
                            title="Remove admin status"
                            aria-label="Remove admin status"
                            onClick={() => updateAdminStatus(user.id, false)}
                            type="button"
                          >
                            <LucideX size={16} strokeWidth={2.5} />
                          </button>
                        </span>
                      ) : (
                        <span className={`inline-flex items-center px-2 py-1 rounded text-sm font-medium ${
                          isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'
                        }`}>
                          Regular User
                        </span>
                      )}
                    </div>
                  </div>
                  <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    <p style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}>User ID: {user.id}</p>
                  </div>
                </div>
                
                <div className="mt-4">
                  <p className="font-semibold mb-1">Update Admin Status:</p>
                  <div className="flex flex-wrap gap-2">
                    {!user.is_admin && (
                      <button
                        className="bg-blue-600 hover:opacity-90 text-white px-4 py-1 rounded focus:outline focus:ring-2 focus:ring-offset-2"
                        onClick={() => updateAdminStatus(user.id, true)}
                      >
                        Make Admin
                      </button>
                    )}
                  </div>
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
  RoleApprovalPage, 
  'Role Management'
)
