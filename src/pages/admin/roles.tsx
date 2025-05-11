'use client'
import { useEffect, useState } from 'react'
import { X as LucideX } from 'lucide-react'
import withAuth from '@/components/withAuth'
import { useTheme } from '@/contexts/ThemeContext'

function RoleApprovalPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { isDarkMode } = useTheme()

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Fetch pending users (from the database)
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
        
        // Merge users by ID to prevent duplicates
        const combinedUsers = mergeUsersByID([...pendingUsers, ...usersWithRoles])
        setUsers(combinedUsers)
      } catch (error) {
        console.error('Error fetching users:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
  }, [])

  // Helper function to merge users and avoid duplicates
  const mergeUsersByID = (users: any[]) => {
    const userMap = new Map()
    
    users.forEach(user => {
      if (userMap.has(user.id)) {
        // Merge with existing user entry
        const existingUser = userMap.get(user.id)
        userMap.set(user.id, {
          ...existingUser,
          ...user,
          // Merge roles and pending_roles arrays
          roles: [...new Set([...(existingUser.roles || []), ...(user.roles || [])])],
          pending_roles: [...new Set([...(existingUser.pending_roles || []), ...(user.pending_roles || [])])]
        })
      } else {
        // Add new user entry
        userMap.set(user.id, user)
      }
    })
    
    return Array.from(userMap.values())
  }

  // Remove a role from a user
  const removeRole = async (id: string, role: string) => {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const response = await fetch(`/api/admin/remove-user-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, role })
      });
      if (!response.ok) {
        throw new Error(`Failed to remove role: ${response.statusText}`);
      }
      // Refresh the user list
      let pendingUsers = [];
      let usersWithRoles = [];
      try {
        const pendingResponse = await fetch('/api/admin/pending-users');
        if (pendingResponse.ok) {
          pendingUsers = await pendingResponse.json();
        }
      } catch (err) {
        console.error('Error fetching pending users:', err);
      }
      try {
        const rolesResponse = await fetch('/api/admin/users-with-roles');
        if (rolesResponse.ok) {
          usersWithRoles = await rolesResponse.json();
        }
      } catch (err) {
        console.error('Error fetching users with roles:', err);
      }
      const combinedUsers = mergeUsersByID([...pendingUsers, ...usersWithRoles]);
      setUsers(combinedUsers);
    } catch (error) {
      console.error('Error removing role:', error);
      alert('Failed to remove user role');
    }
  }

  const updateRole = async (id: string, newRole: string, approved = false) => {
    try {
      // Update role in the database
      const response = await fetch(`/api/admin/update-user-role`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, newRole, approved })
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
      
      const combinedUsers = mergeUsersByID([...pendingUsers, ...usersWithRoles])
      setUsers(combinedUsers)
    } catch (error) {
      console.error('Error updating role:', error)
      alert('Failed to update user role')
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
            {users.map(user => {
              const currentRoles = user.roles || [];
              const currentRoleLabel = Array.isArray(currentRoles) && currentRoles.length === 1 ? 'Current Role:' : 'Current Roles:';
              const allRoles = ['admin', 'coach', 'player', 'parent'];
              const unavailableRoles = new Set([...(currentRoles || [])]);
              const availableRoles = allRoles.filter(r => !unavailableRoles.has(r));
              
              return (
                <li key={user.id} className={`border p-4 rounded shadow-sm ${isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
                  <div className="flex justify-between">
                    <div>
                      <p><strong>Email:</strong> {user.email}</p>
                      <p><strong>{currentRoleLabel}</strong></p>
                      {Array.isArray(currentRoles) && currentRoles.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-1">
                          {currentRoles.map((role: string) => {
                            let btnClass = '';
                            if (role === 'admin') btnClass = isDarkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800';
                            else if (role === 'coach') btnClass = isDarkMode ? 'bg-green-900 text-green-200' : 'bg-green-100 text-green-800';
                            else if (role === 'player') btnClass = isDarkMode ? 'bg-purple-900 text-purple-200' : 'bg-purple-100 text-purple-800';
                            else if (role === 'parent') btnClass = isDarkMode ? 'bg-orange-900 text-orange-200' : 'bg-orange-100 text-orange-800';
                            return (
                              <span key={role} className={`inline-flex items-center px-2 py-1 rounded text-sm font-medium ${btnClass}`}> 
                                {role.charAt(0).toUpperCase() + role.slice(1)}
                                <button
                                  className={`ml-2 ${isDarkMode ? 'text-red-400 hover:bg-red-900' : 'text-red-600 hover:bg-red-100'} rounded-full p-1 focus:outline-none focus:ring-2 focus:ring-red-400`}
                                  title={`Remove ${role}`}
                                  aria-label={`Remove ${role}`}
                                  onClick={() => removeRole(user.id, role)}
                                  type="button"
                                >
                                  <LucideX size={16} strokeWidth={2.5} />
                                </button>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                    <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      <p style={{ wordBreak: 'break-all', overflowWrap: 'anywhere' }}>User ID: {user.id}</p>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <p className="font-semibold mb-1">Update Roles:</p>
                    <div className="flex flex-wrap gap-2">
                      {availableRoles.map(role => {
                        let btnClass = '';
                        let label = '';
                        if (role === 'admin') {
                          btnClass = 'bg-blue-600';
                          label = 'Set as Admin';
                        } else if (role === 'coach') {
                          btnClass = 'bg-green-600';
                          label = 'Set as Coach';
                        } else if (role === 'player') {
                          btnClass = 'bg-purple-600';
                          label = 'Set as Player';
                        } else if (role === 'parent') {
                          btnClass = 'bg-orange-600';
                          label = 'Set as Parent';
                        }
                        const isPendingRole = user.pending_roles?.includes(role);
                        return (
                          <button
                            key={role}
                            className={`${btnClass} hover:opacity-90 text-white px-4 py-1 rounded flex items-center gap-2 focus:outline focus:ring-2 focus:ring-offset-2`}
                            onClick={() => updateRole(user.id, role, true)}
                          >
                            {label}
                            {isPendingRole && <span className="text-xs text-yellow-200 ml-1">(requested)</span>}
                          </button>
                        );
                      })}
                    </div>
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

// Restrict this page to admin users only
export default withAuth(RoleApprovalPage, ['admin'], 'Role Management')
