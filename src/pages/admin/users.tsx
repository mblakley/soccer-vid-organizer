import { useState, useEffect } from 'react'
import withAuth from '@/components/withAuth'

function AdminUsersPage({ user }: { user: any }) {
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        let pendingUsers = []
        try {
          const pendingResponse = await fetch('/api/admin/pending-users')
          if (pendingResponse.ok) {
            pendingUsers = await pendingResponse.json()
          }
        } catch (err) {
          console.error('Error in pending users fetch:', err)
        }
        let usersWithRoles = []
        try {
          const rolesResponse = await fetch('/api/admin/users-with-roles')
          if (rolesResponse.ok) {
            usersWithRoles = await rolesResponse.json()
          }
        } catch (err) {
          console.error('Error in users with roles fetch:', err)
        }
        // Deduplicate users by id
        const userMap = new Map()
        ;[...pendingUsers, ...usersWithRoles].forEach(u => {
          if (!userMap.has(u.id)) {
            userMap.set(u.id, u)
          }
        })
        setAllUsers(Array.from(userMap.values()))
      } catch (error) {
        console.error('Error fetching users:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
  }, [])

  const handleBanToggle = async (userId: string, isBanned: boolean) => {
    setActionLoading(userId + '-ban')
    try {
      const res = await fetch('/api/admin/disable-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, ban: !isBanned })
      })
      if (!res.ok) throw new Error(await res.text())
      window.location.reload()
    } catch (err) {
      alert('Failed to update ban status: ' + err)
    } finally {
      setActionLoading(null)
    }
  }

  const handleRemove = async (userId: string) => {
    if (!window.confirm('Are you sure you want to permanently remove this user?')) return
    setActionLoading(userId + '-remove')
    try {
      const res = await fetch('/api/admin/remove-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })
      if (!res.ok) throw new Error(await res.text())
      window.location.reload()
    } catch (err) {
      alert('Failed to remove user: ' + err)
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) return <div className="p-8">Loading users...</div>

  return (
    <div className="p-8">
      <div className="mt-4">
        <h2 className="text-xl font-semibold mb-2">All Users ({allUsers.length})</h2>
        <ul className="space-y-2">
          {allUsers.map((u) => {
            const isBanned = u.banned === true || u.ban === true || u.is_banned === true
            // Prefer user_metadata.name, then user_metadata.full_name, then nothing
            const userName = u.user_metadata?.name || u.user_metadata?.full_name || ''
            const approvedRoles = user.roles
            return (
              <li key={u.id} className="border p-2 rounded">
                <div className="flex justify-between items-center">
                  <div className="w-full">
                    {userName && <p className="text-lg font-bold mb-1">{userName}</p>}
                    <p className="font-medium">{u.email}</p>
                    <p className="text-xs text-gray-500 break-all">ID: {u.id}</p>
                    <p className="text-sm">Roles: {approvedRoles.length > 0 ? approvedRoles.join(', ') : 'None'}</p>
                    {isBanned && <span className="text-xs text-red-500">(Disabled)</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className={`px-3 py-1 rounded text-xs text-white ${isBanned ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-500 hover:bg-yellow-600'}`}
                      disabled={actionLoading === u.id + '-ban'}
                      onClick={() => handleBanToggle(u.id, isBanned)}
                    >
                      {actionLoading === u.id + '-ban'
                        ? (isBanned ? 'Enabling...' : 'Disabling...')
                        : (isBanned ? 'Enable' : 'Disable')}
                    </button>
                    <button
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-xs"
                      disabled={actionLoading === u.id + '-remove'}
                      onClick={() => handleRemove(u.id)}
                    >
                      {actionLoading === u.id + '-remove' ? 'Removing...' : 'Permanently Remove'}
                    </button>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
        {allUsers.length === 0 && (
          <p className="text-gray-500">No users found.</p>
        )}
      </div>
    </div>
  )
}

export default withAuth(AdminUsersPage, ['admin'], 'User Management') 