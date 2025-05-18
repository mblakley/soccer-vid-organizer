'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { withAdminAuth } from '@/components/auth'
import { useTheme } from '@/contexts/ThemeContext'
import { supabase } from '@/lib/supabaseClient'

function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    adminUsers: 0,
    disabledUsers: 0,
    totalTeams: 0,
    activeTeams: 0,
    totalTeamMembers: 0
  })
  const [loading, setLoading] = useState(true)
  const { isDarkMode } = useTheme()

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch user stats
        const response = await fetch('/api/admin/users-with-roles')
        const users = response.ok ? await response.json() : []
        
        // Fetch team stats
        const { data: teams, error: teamsError } = await supabase
          .from('teams')
          .select('id, club_affiliation')
          .neq('club_affiliation', 'System')

        // Fetch team member stats
        const { data: teamMembers, error: membersError } = await supabase
          .from('team_members')
          .select('id, is_active, user_id')
          .eq('is_active', true)

        if (teamsError) throw teamsError
        if (membersError) throw membersError

        // Create a set of user IDs that are associated with team members
        const teamMemberUserIds = new Set(teamMembers?.map(member => member.user_id) || [])

        setStats({
          totalUsers: users.filter((u: any) => {
            // Include user if:
            // 1. Not a temp user OR
            // 2. Is a temp user but is associated with a team member
            return !u.email?.startsWith('temp_') || 
                   !u.email?.endsWith('@placeholder.com') || 
                   teamMemberUserIds.has(u.id)
          }).length,
          adminUsers: users.filter((u: any) => u.is_admin).length,
          disabledUsers: users.filter((u: any) => u.user_metadata?.disabled).length,
          totalTeams: teams?.length || 0,
          activeTeams: teams?.filter(t => t.club_affiliation !== 'System').length || 0,
          totalTeamMembers: teamMembers?.length || 0
        })
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="p-8">      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className={`p-4 rounded-lg shadow ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h3 className="text-lg font-semibold mb-2">Total Users</h3>
          <p className="text-3xl font-bold">{stats.totalUsers}</p>
        </div>
        <div className={`p-4 rounded-lg shadow ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h3 className="text-lg font-semibold mb-2">Admin Users</h3>
          <p className="text-3xl font-bold">{stats.adminUsers}</p>
        </div>
        <div className={`p-4 rounded-lg shadow ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h3 className="text-lg font-semibold mb-2">Disabled Users</h3>
          <p className="text-3xl font-bold">{stats.disabledUsers}</p>
        </div>
        <div className={`p-4 rounded-lg shadow ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h3 className="text-lg font-semibold mb-2">Total Teams</h3>
          <p className="text-3xl font-bold">{stats.totalTeams}</p>
        </div>
        <div className={`p-4 rounded-lg shadow ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h3 className="text-lg font-semibold mb-2">Active Teams</h3>
          <p className="text-3xl font-bold">{stats.activeTeams}</p>
        </div>
        <div className={`p-4 rounded-lg shadow ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h3 className="text-lg font-semibold mb-2">Team Members</h3>
          <p className="text-3xl font-bold">{stats.totalTeamMembers}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link 
          href="/admin/users" 
          className={`p-6 rounded-lg shadow hover:shadow-lg transition-shadow ${
            isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'
          }`}
        >
          <h2 className="text-xl font-semibold mb-2">User Management</h2>
          <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Manage user accounts, disable/enable users, and remove users from the system.
          </p>
        </Link>

        <Link 
          href="/admin/teams" 
          className={`p-6 rounded-lg shadow hover:shadow-lg transition-shadow ${
            isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'
          }`}
        >
          <h2 className="text-xl font-semibold mb-2">Team Management</h2>
          <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Create and manage teams, view team members, and handle team settings.
          </p>
        </Link>

        <Link 
          href="/admin/team-members" 
          className={`p-6 rounded-lg shadow hover:shadow-lg transition-shadow ${
            isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'
          }`}
        >
          <h2 className="text-xl font-semibold mb-2">Team Member Management</h2>
          <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Add members to teams, assign roles, and manage team membership.
          </p>
        </Link>
      </div>
    </div>
  )
}

export default withAdminAuth(
  AdminDashboard,
  'Admin Dashboard'
)
