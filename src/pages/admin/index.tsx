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
    totalTeamMembers: 0,
    pendingJoinRequests: 0,
    pendingRoleRequests: 0,
    totalLeagues: 0,
    totalTournaments: 0,
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

        // Fetch pending team join requests
        const { data: joinRequests, error: joinError } = await supabase
          .from('team_member_requests')
          .select('id')
          .eq('status', 'pending')

        // Fetch pending role requests
        const { data: roleRequests, error: roleError } = await supabase
          .from('team_member_role_requests')
          .select('id')
          .eq('status', 'pending')

        // Fetch leagues count
        const { count: leaguesCount, error: leaguesError } = await supabase
          .from('leagues')
          .select('id', { count: 'exact', head: true })

        // Fetch tournaments count
        const { count: tournamentsCount, error: tournamentsError } = await supabase
          .from('tournaments')
          .select('id', { count: 'exact', head: true })

        if (teamsError) throw teamsError
        if (membersError) throw membersError
        if (joinError) throw joinError
        if (roleError) throw roleError
        if (leaguesError) throw leaguesError
        if (tournamentsError) throw tournamentsError

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
          totalTeamMembers: teamMembers?.length || 0,
          pendingJoinRequests: joinRequests?.length || 0,
          pendingRoleRequests: roleRequests?.length || 0,
          totalLeagues: leaguesCount || 0,
          totalTournaments: tournamentsCount || 0,
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

  const totalPendingRequests = stats.pendingJoinRequests + stats.pendingRoleRequests

  return (
    <div className="p-8">      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
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
          <h3 className="text-lg font-semibold mb-2">Total Leagues</h3>
          <p className="text-3xl font-bold">{stats.totalLeagues}</p>
        </div>
        <div className={`p-4 rounded-lg shadow ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h3 className="text-lg font-semibold mb-2">Total Tournaments</h3>
          <p className="text-3xl font-bold">{stats.totalTournaments}</p>
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
        <div className={`p-4 rounded-lg shadow ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h3 className="text-lg font-semibold mb-2">Pending Team Requests</h3>
          <p className="text-3xl font-bold">{stats.pendingJoinRequests}</p>
        </div>
        <div className={`p-4 rounded-lg shadow ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h3 className="text-lg font-semibold mb-2">Pending Role Requests</h3>
          <p className="text-3xl font-bold">{stats.pendingRoleRequests}</p>
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
            <div className="mt-2 flex gap-2">
              {stats.pendingJoinRequests > 0 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {stats.pendingJoinRequests} team request{stats.pendingJoinRequests !== 1 ? 's' : ''}
                </span>
              )}
              {stats.pendingRoleRequests > 0 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  {stats.pendingRoleRequests} role request{stats.pendingRoleRequests !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </p>
        </Link>

        <Link 
          href="/admin/leagues" 
          className={`p-6 rounded-lg shadow hover:shadow-lg transition-shadow ${
            isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'
          }`}
        >
          <h2 className="text-xl font-semibold mb-2">Manage Leagues</h2>
          <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Create and manage leagues, view league details, and handle league settings.
          </p>
        </Link>

        <Link 
          href="/admin/tournaments" 
          className={`p-6 rounded-lg shadow hover:shadow-lg transition-shadow ${
            isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-50'
          }`}
        >
          <h2 className="text-xl font-semibold mb-2">Manage Tournaments</h2>
          <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Create and manage tournaments, view tournament details, and handle tournament settings.
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
