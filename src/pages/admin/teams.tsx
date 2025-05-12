'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useTheme } from '@/contexts/ThemeContext'
import ThemeToggle from '@/components/ThemeToggle'
import { withAdminAuth } from '@/components/auth'
import { User } from '@supabase/supabase-js'

interface AuthUser {
  id: string
  email?: string
  user_metadata?: {
    full_name?: string
  }
}

interface Team {
  id: string
  name: string
  club_affiliation: string | null
  season: string | null
  age_group: string | null
  additional_info: Record<string, any> | null
  created_by: string | null
  created_at: string | null
  updated_at: string | null
}

interface TeamMember {
  id: string
  team_id: string
  user_id: string
  roles: string[]
  jersey_number?: string
  position?: string
  joined_date: string
  left_date?: string
  is_active: boolean
  user_email?: string
  user_name?: string
}

function TeamsPage() {
  const [newTeam, setNewTeam] = useState({
    name: '',
    club_affiliation: '',
    season: '',
    age_group: '',
    additional_info: {}
  })
  const { isDarkMode } = useTheme()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)

  useEffect(() => {
    fetchTeams()
  }, [])

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data, error } = await supabase
        .from('teams')
        .insert([{
          name: newTeam.name,
          club_affiliation: newTeam.club_affiliation || null,
          season: newTeam.season || null,
          age_group: newTeam.age_group || null,
          additional_info: newTeam.additional_info
        }])
        .select()
        .single()

      if (error) throw error

      // Reset form after successful creation
      setNewTeam({
        name: '',
        club_affiliation: '',
        season: '',
        age_group: '',
        additional_info: {}
      })

      // Refresh the teams list
      await fetchTeams()

      alert('Team created successfully!')
    } catch (error) {
      console.error('Error creating team:', error)
      alert('Failed to create team. Please try again.')
    }
  }

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select()
        .neq('club_affiliation', 'System')

      if (error) throw error

      setTeams(data)
    } catch (error) {
      console.error('Error fetching teams:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTeamClick = async (team: Team) => {
    setSelectedTeam(team)
    setLoadingMembers(true)
    try {
      // First fetch team members
      const { data: membersData, error: membersError } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', team.id)
        .eq('is_active', true)

      if (membersError) throw membersError

      // Then fetch all users from our API endpoint
      const response = await fetch('/api/admin/users')
      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }
      const users = await response.json() as AuthUser[]

      // Create a map of user_id to user data
      const userMap = new Map(users.map((user) => [
        user.id, 
        { 
          email: user.email,
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown'
        }
      ]))

      // Combine the data
      const membersWithUserData = membersData.map(member => ({
        ...member,
        user_email: userMap.get(member.user_id)?.email,
        user_name: userMap.get(member.user_id)?.name
      }))

      setTeamMembers(membersWithUserData)
    } catch (error) {
      console.error('Error fetching team members:', error)
      setTeamMembers([])
    } finally {
      setLoadingMembers(false)
    }
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        {/* Create Team Form */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4">Create New Team</h2>
          <form onSubmit={handleCreateTeam} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Team Name</label>
              <input
                type="text"
                value={newTeam.name}
                onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                className={`w-full p-2 rounded border ${
                  isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                }`}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Club Affiliation</label>
              <input
                type="text"
                value={newTeam.club_affiliation}
                onChange={(e) => setNewTeam({ ...newTeam, club_affiliation: e.target.value })}
                className={`w-full p-2 rounded border ${
                  isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                }`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Season</label>
              <input
                type="text"
                value={newTeam.season}
                onChange={(e) => setNewTeam({ ...newTeam, season: e.target.value })}
                className={`w-full p-2 rounded border ${
                  isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                }`}
                placeholder="e.g., 2024 Spring"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Age Group</label>
              <input
                type="text"
                value={newTeam.age_group}
                onChange={(e) => setNewTeam({ ...newTeam, age_group: e.target.value })}
                className={`w-full p-2 rounded border ${
                  isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                }`}
                placeholder="e.g., U12, U14, etc."
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Create Team
            </button>
          </form>
        </div>

        {/* Teams List */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">All Teams</h2>
          {loading ? (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className={`min-w-full divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                <thead className={isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}>
                  <tr>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Name</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Club Affiliation</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Season</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Age Group</th>
                    <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Created</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700 bg-gray-900' : 'divide-gray-200 bg-white'}`}>
                  {teams.map((team) => (
                    <tr 
                      key={team.id}
                      className={`${isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-50'} cursor-pointer`}
                      onClick={() => handleTeamClick(team)}
                    >
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>{team.name}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>{team.club_affiliation || '-'}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>{team.season || '-'}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>{team.age_group || '-'}</td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                        {team.created_at ? new Date(team.created_at).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Team Members Modal */}
        {selectedTeam && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">{selectedTeam.name} - Team Members</h3>
                <button
                  onClick={() => setSelectedTeam(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              {loadingMembers ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : teamMembers.length === 0 ? (
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>No team members found</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className={`min-w-full divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                    <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                      <tr>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Name</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Email</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Roles</th>
                        <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>Joined</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                      {teamMembers.map((member) => (
                        <tr key={member.id} className={isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                            {member.user_name}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                            {member.user_email}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                            {member.roles.join(', ')}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                            {new Date(member.joined_date).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default withAdminAuth(TeamsPage)