'use client'
import { useEffect, useState } from 'react'

export default function RoleApprovalPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Fetch pending users (from auth metadata)
        const pendingResponse = await fetch('/api/admin/pending-users')
        let pendingUsers = []
        if (pendingResponse.ok) {
          pendingUsers = await pendingResponse.json()
        } else {
          console.error('Error fetching pending users:', pendingResponse.statusText)
        }

        // Fetch users with assigned roles from our database
        const rolesResponse = await fetch('/api/admin/users-with-roles')
        let usersWithRoles = []
        if (rolesResponse.ok) {
          usersWithRoles = await rolesResponse.json()
        } else {
          console.error('Error fetching users with roles:', rolesResponse.statusText)
        }
        
        // Combine both sets of users
        setUsers([...pendingUsers, ...usersWithRoles])
      } catch (error) {
        console.error('Error fetching users:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
  }, [])

  const updateRole = async (id: string, newRole: string) => {
    try {
      // Update user metadata
      const response = await fetch(`/api/admin/update-user-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, newRole })
      })
      
      if (!response.ok) {
        throw new Error(`Failed to update role: ${response.statusText}`)
      }
      
      // Refresh the user list
      let pendingUsers = []
      let usersWithRoles = []
      
      try {
        const pendingResponse = await fetch('/api/admin/pending-users')
        if (pendingResponse.ok) {
          pendingUsers = await pendingResponse.json()
        }
      } catch (err) {
        console.error('Error fetching pending users:', err)
      }
      
      try {
        const rolesResponse = await fetch('/api/admin/users-with-roles')
        if (rolesResponse.ok) {
          usersWithRoles = await rolesResponse.json()
        }
      } catch (err) {
        console.error('Error fetching users with roles:', err)
      }
      
      setUsers([...pendingUsers, ...usersWithRoles])
    } catch (error) {
      console.error('Error updating role:', error)
      alert('Failed to update user role')
    }
  }

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">User Role Management</h1>
      
      {users.length === 0 ? (
        <div className="bg-gray-100 p-4 rounded">
          <p>No users found.</p>
        </div>
      ) : (
        <div>
          <h2 className="text-xl font-semibold mb-2">Users</h2>
          <ul className="space-y-4">
            {users.map(user => {
              const isPending = user.user_metadata?.roles?.includes('pending');
              const currentRole = user.roles || user.user_metadata?.assigned_role || 'None';
              
              return (
                <li key={user.id} className="border p-4 rounded shadow-sm">
                  <div className="flex justify-between">
                    <div>
                      <p><strong>Email:</strong> {user.email}</p>
                      <p>
                        <strong>Status:</strong> 
                        {isPending ? (
                          <span className="text-yellow-600 font-medium"> Pending Approval</span>
                        ) : (
                          <span className="text-green-600 font-medium"> Active</span>
                        )}
                      </p>
                      <p><strong>Current Role:</strong> {currentRole}</p>
                    </div>
                    <div className="text-sm text-gray-500">
                      <p>User ID: {user.id.substring(0, 8)}...</p>
                    </div>
                  </div>
                  
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      className="bg-blue-600 text-white px-4 py-1 rounded"
                      onClick={() => updateRole(user.id, 'admin')}
                    >
                      Set as Admin
                    </button>
                    <button
                      className="bg-green-600 text-white px-4 py-1 rounded"
                      onClick={() => updateRole(user.id, 'coach')}
                    >
                      Set as Coach
                    </button>
                    <button
                      className="bg-purple-600 text-white px-4 py-1 rounded"
                      onClick={() => updateRole(user.id, 'player')}
                    >
                      Set as Player
                    </button>
                    <button
                      className="bg-orange-600 text-white px-4 py-1 rounded"
                      onClick={() => updateRole(user.id, 'parent')}
                    >
                      Set as Parent
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
