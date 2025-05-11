'use client'
import { useState, useEffect } from 'react'
import withAuth from '@/components/withAuth'
import { useTheme } from '@/contexts/ThemeContext'

function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    pendingRequests: 0,
    roleBreakdown: {
      admin: 0,
      coach: 0,
      player: 0,
      parent: 0
    },
    weeklyMetrics: {
      newUsers: 0,
      uniqueLogins: 0,
      newClips: 0,
      newComments: 0
    }
  })
  const [loading, setLoading] = useState(true)
  const { isDarkMode } = useTheme()

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch pending users
        const pendingResponse = await fetch('/api/admin/pending-users')
        let pendingUsers = []
        if (pendingResponse.ok) {
          pendingUsers = await pendingResponse.json()
        }

        // Fetch users with roles
        const rolesResponse = await fetch('/api/admin/users-with-roles')
        let usersWithRoles = []
        if (rolesResponse.ok) {
          usersWithRoles = await rolesResponse.json()
        }

        // Fetch weekly metrics
        const metricsResponse = await fetch('/api/admin/time-metrics')
        let weeklyMetrics = {
          newUsers: 0,
          uniqueLogins: 0,
          newClips: 0,
          newComments: 0
        }
        if (metricsResponse.ok) {
          weeklyMetrics = await metricsResponse.json()
        }

        // Calculate statistics
        const roleBreakdown = {
          admin: 0,
          coach: 0,
          player: 0,
          parent: 0
        }

        usersWithRoles.forEach((user: { roles?: string[] }) => {
          if (Array.isArray(user.roles)) {
            user.roles.forEach((role: string) => {
              if (role in roleBreakdown) {
                roleBreakdown[role as keyof typeof roleBreakdown]++
              }
            })
          }
        })

        setStats({
          totalUsers: usersWithRoles.length,
          pendingRequests: pendingUsers.length,
          roleBreakdown,
          weeklyMetrics
        })
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) return <div className="p-8">Loading dashboard...</div>

  return (
    <div className="p-8 space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`p-4 rounded-lg shadow ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h3 className="text-lg font-semibold mb-2">Total Users</h3>
          <p className="text-3xl font-bold">{stats.totalUsers}</p>
        </div>
        <div className={`p-4 rounded-lg shadow ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h3 className="text-lg font-semibold mb-2">Pending Requests</h3>
          <p className="text-3xl font-bold">{stats.pendingRequests}</p>
        </div>
        <div className={`p-4 rounded-lg shadow ${isDarkMode ? 'bg-gray-800' : 'bg-white'} col-span-2`}>
          <h3 className="text-lg font-semibold mb-2">Role Distribution</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm">Admins: <span className="font-bold">{stats.roleBreakdown.admin}</span></p>
              <p className="text-sm">Coaches: <span className="font-bold">{stats.roleBreakdown.coach}</span></p>
            </div>
            <div>
              <p className="text-sm">Players: <span className="font-bold">{stats.roleBreakdown.player}</span></p>
              <p className="text-sm">Parents: <span className="font-bold">{stats.roleBreakdown.parent}</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Activity Metrics */}
      <div className={`p-6 rounded-lg shadow ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <h2 className="text-xl font-semibold mb-4">This Week's Activity</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-green-900' : 'bg-green-50'}`}>
            <h3 className="text-sm font-semibold mb-1">New Users</h3>
            <p className="text-2xl font-bold">{stats.weeklyMetrics.newUsers}</p>
          </div>
          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-blue-900' : 'bg-blue-50'}`}>
            <h3 className="text-sm font-semibold mb-1">Active Users</h3>
            <p className="text-2xl font-bold">{stats.weeklyMetrics.uniqueLogins}</p>
          </div>
          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-purple-900' : 'bg-purple-50'}`}>
            <h3 className="text-sm font-semibold mb-1">New Clips</h3>
            <p className="text-2xl font-bold">{stats.weeklyMetrics.newClips}</p>
          </div>
          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-pink-900' : 'bg-pink-50'}`}>
            <h3 className="text-sm font-semibold mb-1">New Comments</h3>
            <p className="text-2xl font-bold">{stats.weeklyMetrics.newComments}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className={`p-6 rounded-lg shadow ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <li>
            <a 
              href="/admin/roles" 
              className={`block p-4 rounded-lg ${isDarkMode ? 'bg-blue-900 hover:bg-blue-800' : 'bg-blue-50 hover:bg-blue-100'} transition-colors`}
            >
              <h3 className="font-semibold">Review Role Requests</h3>
              {stats.pendingRequests > 0 && (
                <p className={`text-sm mt-1 ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}>
                  {stats.pendingRequests} pending request{stats.pendingRequests !== 1 ? 's' : ''}
                </p>
              )}
            </a>
          </li>
          <li>
            <a 
              href="/admin/users" 
              className={`block p-4 rounded-lg ${isDarkMode ? 'bg-purple-900 hover:bg-purple-800' : 'bg-purple-50 hover:bg-purple-100'} transition-colors`}
            >
              <h3 className="font-semibold">Manage Users</h3>
              <p className={`text-sm mt-1 ${isDarkMode ? 'text-purple-300' : 'text-purple-600'}`}>
                {stats.totalUsers} total user{stats.totalUsers !== 1 ? 's' : ''}
              </p>
            </a>
          </li>
        </ul>
      </div>
    </div>
  )
}

// Restrict this page to admin users only
export default withAuth(AdminDashboard, ['admin'], 'Admin Dashboard')
