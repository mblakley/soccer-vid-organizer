'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { withAdminAuth } from '@/components/auth'
import { useTheme } from '@/contexts/ThemeContext'
import { toast } from 'react-toastify'

interface Team {
  id: string
  name: string
  club_affiliation: string | null
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

interface User {
  id: string
  email: string
  user_metadata?: {
    full_name?: string
  }
}

function TeamMembersPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = useState<string>('')
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { isDarkMode } = useTheme()

  useEffect(() => {
    fetchTeams()
    fetchUsers()
  }, [])

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .neq('club_affiliation', 'System')
        .order('name')

      if (error) throw error
      setTeams(data || [])
    } catch (error: any) {
      console.error('Error fetching teams:', error)
      setError('Failed to fetch teams')
    } finally {
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      if (!response.ok) throw new Error('Failed to fetch users')
      const usersData = await response.json()
      setUsers(usersData)
    } catch (error: any) {
      console.error('Error fetching users:', error)
      setError('Failed to fetch users')
    }
  }

  const fetchTeamMembers = async (teamId: string) => {
    setLoadingMembers(true)
    try {
      // First, get team members
      const { data: membersData, error: membersError } = await supabase
        .from('team_members')
        .select(`
          *,
          team_member_roles (
            role
          )
        `)
        .eq('team_id', teamId)
        .eq('is_active', true)

      if (membersError) throw membersError

      // Create a map of user_id to user data
      const userMap = new Map(users.map((user) => [
        user.id, 
        { 
          email: user.email,
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Unknown'
        }
      ]))

      // Combine the data and transform roles array
      const membersWithUserData = membersData.map(member => ({
        ...member,
        roles: member.team_member_roles.map((r: any) => r.role),
        user_email: userMap.get(member.user_id)?.email,
        user_name: userMap.get(member.user_id)?.name
      }))

      setTeamMembers(membersWithUserData)
    } catch (error: any) {
      console.error('Error fetching team members:', error)
      setError('Failed to fetch team members')
    } finally {
      setLoadingMembers(false)
    }
  }

  const handleTeamChange = (teamId: string) => {
    setSelectedTeam(teamId)
    if (teamId) {
      fetchTeamMembers(teamId)
    } else {
      setTeamMembers([])
    }
  }

  const addTeamMember = async (userId: string) => {
    if (!selectedTeam) return

    try {
      // First, create the team member record
      const { data: teamMember, error: memberError } = await supabase
        .from('team_members')
        .insert([{
          team_id: selectedTeam,
          user_id: userId,
          joined_date: new Date().toISOString(),
          is_active: true
        }])
        .select()
        .single()

      if (memberError) throw memberError

      // Then, create the role record
      const { error: roleError } = await supabase
        .from('team_member_roles')
        .insert([{
          team_member_id: teamMember.id,
          role: 'player'
        }])

      if (roleError) throw roleError

      toast.success('Team member added successfully')
      fetchTeamMembers(selectedTeam)
    } catch (error: any) {
      console.error('Error adding team member:', error)
      toast.error('Failed to add team member')
    }
  }

  const removeTeamMember = async (memberId: string) => {
    if (!confirm('Are you sure you want to remove this team member?')) return

    try {
      const { error } = await supabase
        .from('team_members')
        .update({
          is_active: false,
          left_date: new Date().toISOString()
        })
        .eq('id', memberId)

      if (error) throw error

      toast.success('Team member removed successfully')
      fetchTeamMembers(selectedTeam)
    } catch (error: any) {
      console.error('Error removing team member:', error)
      toast.error('Failed to remove team member')
    }
  }

  const updateTeamMemberRole = async (memberId: string, role: string) => {
    try {
      // First, delete existing roles
      const { error: deleteError } = await supabase
        .from('team_member_roles')
        .delete()
        .eq('team_member_id', memberId)

      if (deleteError) throw deleteError

      // Then, insert the new role
      const { error: insertError } = await supabase
        .from('team_member_roles')
        .insert([{
          team_member_id: memberId,
          role: role
        }])

      if (insertError) throw insertError

      toast.success('Team member role updated successfully')
      fetchTeamMembers(selectedTeam)
    } catch (error: any) {
      console.error('Error updating team member role:', error)
      toast.error('Failed to update team member role')
    }
  }

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Team Member Management</h1>

      {error && (
        <div className={`mb-4 p-4 text-sm rounded ${isDarkMode ? 'bg-red-800 text-red-200' : 'bg-red-100 text-red-700'}`} role="alert">
          {error}
        </div>
      )}

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Select Team</label>
        <select
          value={selectedTeam}
          onChange={(e) => handleTeamChange(e.target.value)}
          className={`w-full p-2 rounded border ${
            isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
          }`}
        >
          <option value="">Select a team</option>
          {teams.map(team => (
            <option key={team.id} value={team.id}>
              {team.name} {team.club_affiliation ? `(${team.club_affiliation})` : ''}
            </option>
          ))}
        </select>
      </div>

      {selectedTeam && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Add New Team Member</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {users
                .filter(user => !teamMembers.some(member => member.user_id === user.id))
                .map(user => (
                  <div
                    key={user.id}
                    className={`p-4 rounded border ${
                      isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <p className="font-medium">{user.user_metadata?.full_name || user.email}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                    <button
                      onClick={() => addTeamMember(user.id)}
                      className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Add to Team
                    </button>
                  </div>
                ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold mb-4">Current Team Members</h2>
            {loadingMembers ? (
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : teamMembers.length === 0 ? (
              <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>No team members found</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teamMembers.map(member => (
                  <div
                    key={member.id}
                    className={`p-4 rounded border ${
                      isDarkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{member.user_name}</p>
                        <p className="text-sm text-gray-500">{member.user_email}</p>
                        <p className="text-sm mt-2">
                          <strong>Roles:</strong>{' '}
                          {member.roles.join(', ')}
                        </p>
                        <p className="text-sm">
                          <strong>Joined:</strong>{' '}
                          {new Date(member.joined_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <select
                          value={member.roles[0]}
                          onChange={(e) => updateTeamMemberRole(member.id, e.target.value)}
                          className={`p-1 rounded border ${
                            isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                          }`}
                        >
                          <option value="player">Player</option>
                          <option value="coach">Coach</option>
                          <option value="parent">Parent</option>
                          <option value="manager">Manager</option>
                          <option value="analyst">Analyst</option>
                        </select>
                        <button
                          onClick={() => removeTeamMember(member.id)}
                          className="block w-full px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default withAdminAuth(
  TeamMembersPage,
  'Team Member Management'
) 