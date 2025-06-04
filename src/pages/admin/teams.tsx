'use client'
import { useState, useEffect } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import ThemeToggle from '@/components/ThemeToggle'
import { withAdminAuth } from '@/components/auth'
import { Pencil, Eye, ArrowLeft } from 'lucide-react'
import { toast } from 'react-toastify'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
} from '@tanstack/react-table'
import { apiClient } from '@/lib/api/client'
import { Team, TeamMember } from '@/lib/types/teams'
import { ErrorResponse } from '@/lib/types/api'
import {
  AdminListTeamsApiResponseForTeamsPage,
  AdminCreateTeamRequest,
  AdminCreateTeamApiResponse,
  AdminUpdateTeamRequest,
  AdminUpdateTeamApiResponse,
  AdminDeleteApiResponse,
  AdminTeamMembersApiResponse
} from '@/lib/types/admin'

function isErrorResponse(response: any): response is ErrorResponse {
  return response && typeof response.error === 'string';
}

const columnHelper = createColumnHelper<Team>()

function TeamsPage() {
  const router = useRouter()
  const [newTeam, setNewTeam] = useState<AdminCreateTeamRequest>({
    name: '',
    additional_info: {}
  })
  const { isDarkMode } = useTheme()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [sorting, setSorting] = useState<SortingState>([])
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [error, setError] = useState<string | null>(null);

  const columns = [
    columnHelper.accessor('name', {
      header: 'Name',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('club_affiliation', {
      header: 'Club Affiliation',
      cell: info => info.getValue() || '-',
    }),
    columnHelper.accessor('season', {
      header: 'Season',
      cell: info => info.getValue() || '-',
    }),
    columnHelper.accessor('age_group', {
      header: 'Age Group',
      cell: info => info.getValue() || '-',
    }),
    columnHelper.accessor('gender', {
      header: 'Gender',
      cell: info => info.getValue() || '-',
    }),
    columnHelper.accessor('created_at', {
      header: 'Created',
      cell: info => info.getValue() ? new Date(info.getValue()!).toLocaleDateString() : '-',
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: props => (
        <div className="flex gap-2">
          <button
            onClick={() => handleEditClick(props.row.original)}
            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-200 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            title="Edit Team"
          >
            <Pencil size={20} />
          </button>
          <button
            onClick={() => router.push(`/admin/team-members?teamId=${props.row.original.id}`)}
            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-200 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            title="View Team Members"
          >
            <Eye size={20} />
          </button>
        </div>
      ),
    }),
  ]

  const table = useReactTable({
    data: teams,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  })

  useEffect(() => {
    fetchTeams()
  }, [])

  const fetchTeams = async () => {
    setLoading(true);
    setPageError(null);
    try {
      const response = await apiClient.get<AdminListTeamsApiResponseForTeamsPage>('/api/admin/teams/list')
      
      if (isErrorResponse(response)) {
        toast.error(response.error || 'Failed to fetch teams');
        setPageError(response.error || 'Failed to fetch teams');
        setTeams([]);
      } else if (response && response.teams) {
        setTeams(response.teams)
      } else {
        toast.error('Failed to fetch teams: Invalid response');
        setPageError('Failed to fetch teams: Invalid response');
        setTeams([]);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch teams')
      setPageError(error.message || 'Failed to fetch teams');
      setTeams([]);
    } finally {
      setLoading(false)
    }
  }

  const createTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    // newTeam state is already AdminCreateTeamRequest
    if (!newTeam.name) {
      setFormError("Team name is required.");
      return;
    }
    try {
      const response = await apiClient.post<AdminCreateTeamApiResponse>('/api/admin/teams/create', newTeam);
      if (isErrorResponse(response)) {
        throw new Error(response.error);
      }
      toast.success('Team created successfully');
      setNewTeam({ name: '', additional_info: {} }); // Reset form, ensure all fields of AdminCreateTeamRequest are reset
      fetchTeams();
      setShowTeamModal(false); // Close modal on success
    } catch (error: any) {
      toast.error(error.message || 'Failed to create team');
      setFormError(error.message || 'Failed to create team');
    }
  }

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('Are you sure you want to delete this team?')) return
    setError(null); // Use general page error or a specific delete error state
    try {
      const response = await apiClient.delete<AdminDeleteApiResponse>(`/api/admin/teams/${teamId}/delete`);
      
      if (isErrorResponse(response) || (response && response.success === false)) {
        const errorMsg = isErrorResponse(response) ? response.error : (response?.message || 'Failed to delete team');
        throw new Error(errorMsg);
      }
      
      toast.success(response?.message || 'Team deleted successfully');
      fetchTeams(); // Refresh the list
    } catch (err: any) {
      console.error('Error deleting team:', err);
      setError(err.message || 'Failed to delete team');
      toast.error(err.message || 'Failed to delete team');
    }
  }

  // This function seems to be unused in the provided snippet. Assuming it might be called from a modal save.
  // If it's indeed called, its body would need to be updated similarly.
  // For now, an example of how it would look if `editingTeamId` and `newTeam` (as AdminUpdateTeamRequest) are used.
  const handleUpdateTeam = async (teamId: string, updates: AdminUpdateTeamRequest) => {
    setError(null);
    try {
      const response = await apiClient.put<AdminUpdateTeamApiResponse>(`/api/admin/teams/${teamId}/update`, updates);
      
      if (isErrorResponse(response)) {
        throw new Error(response.error);
      }
      
      toast.success('Team updated successfully');
      fetchTeams(); // Refresh the list
      setShowTeamModal(false); // Close modal
      setEditingTeamId(null);
    } catch (err: any) {
      console.error('Error updating team:', err);
      setError(err.message || 'Failed to update team');
      toast.error(err.message || 'Failed to update team');
    }
  }

  const handleTeamClick = async (team: Team) => {
    setSelectedTeam(team);
    setLoadingMembers(true);
    setTeamMembers([]); // Clear previous members
    try {
      // Fetch team members for the selected team using the new API endpoint
      const membersResponse = await apiClient.get<AdminTeamMembersApiResponse>(`/api/admin/teams/${team.id}/members`);

      if (isErrorResponse(membersResponse)) {
        throw new Error(membersResponse.error);
      }
      
      // The AdminTeamMembersResponse already contains TeamMember[] which includes user_email and user_name.
      // So, no separate fetching of all users and mapping is needed if the API provides this directly.
      // If the API /api/admin/teams/:teamId/members only returns basic team_member rows without user details,
      // then the old logic of fetching all users and mapping would still be needed, but it should use apiClient for users.

      // Assuming /api/admin/teams/:teamId/members returns members with pre-joined user_name and user_email
      // as per teamMemberSchema in src/lib/types/teams.ts
      if (membersResponse && membersResponse.members) {
        setTeamMembers(membersResponse.members);
      } else {
        setTeamMembers([]);
        // Optionally, show a toast or message if no members found or response was empty
      }

    } catch (error: any) {
      console.error('Error fetching team members:', error);
      toast.error(error.message || 'Failed to fetch team members');
      setTeamMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  }

  // Handle clicking the Edit button for a team
  const handleEditClick = (teamToEdit: Team) => {
    setEditingTeamId(teamToEdit.id);
    setNewTeam({
      name: teamToEdit.name,
      club_affiliation: teamToEdit.club_affiliation || '',
      season: teamToEdit.season || '',
      age_group: teamToEdit.age_group || '',
      gender: teamToEdit.gender || '',
      additional_info: teamToEdit.additional_info || {}
    });
    setShowTeamModal(true);
  };

  // Handle opening the create team modal
  const handleCreateClick = () => {
    setNewTeam({ name: '', additional_info: {} });
    setEditingTeamId(null);
    setShowTeamModal(true);
  };

  // Handle closing the team modal
  const handleCloseTeamModal = () => {
    setShowTeamModal(false);
    setNewTeam({ name: '', additional_info: {} });
    setEditingTeamId(null);
    setFormError(null);
  };

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null);
    try {
      const teamData = {
        name: newTeam.name,
        club_affiliation: newTeam.club_affiliation || undefined,
        season: newTeam.season || undefined,
        age_group: newTeam.age_group || undefined,
        gender: newTeam.gender || undefined,
        additional_info: newTeam.additional_info || undefined
      };

      if (editingTeamId) {
        // Update existing team
        await handleUpdateTeam(editingTeamId, teamData)
        toast.success('Team updated successfully!');
        setEditingTeamId(null); // Exit edit mode
      } else {
        // Create new team
        await createTeam(e)
        toast.success('Team created successfully!');
      }

      // Reset form
      setNewTeam({
        name: '',
        club_affiliation: '',
        season: '',
        age_group: '',
        gender: '',
        additional_info: null
      })

      await fetchTeams() // Refresh the teams list
    } catch (error: any) {
      console.error('Error saving team:', error)
      setFormError(error.message || 'Failed to save team. Please try again.');
    }
  }

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="absolute top-4 right-4">
          <ThemeToggle />
        </div>

        <div className="mb-6">
          <Link 
            href="/admin" 
            className={`inline-flex items-center px-4 py-2 rounded-md ${
              isDarkMode 
                ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>

        <h1 className={`text-2xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Teams
        </h1>

        <form onSubmit={createTeam} className="mb-8">
          <div className="flex gap-4">
            <input
              type="text"
              value={newTeam.name}
              onChange={e => setNewTeam({ ...newTeam, name: e.target.value })}
              placeholder="Team name"
              className={`flex-1 px-4 py-2 rounded border ${
                isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
              }`}
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Create Team
            </button>
          </div>
        </form>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map(team => (
            <div
              key={team.id}
              className={`p-4 rounded-lg border ${
                isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}
            >
              <h2 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {team.name}
              </h2>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Created: {new Date(team.created_at || '').toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>

        {/* Team Form Modal */}
        {showTeamModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">
                  {editingTeamId ? `Edit Team: ${teams.find(t => t.id === editingTeamId)?.name || ''}` : 'Create New Team'}
                </h3>
                <button
                  onClick={handleCloseTeamModal}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              {formError && (
                <div className={`mb-4 p-3 text-sm rounded ${isDarkMode ? 'bg-red-800 text-red-200' : 'bg-red-100 text-red-700'}`} role="alert">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSaveTeam} className="space-y-4">
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
                <div>
                  <label className="block text-sm font-medium mb-2">Gender</label>
                  <select
                    value={newTeam.gender}
                    onChange={(e) => setNewTeam({ ...newTeam, gender: e.target.value })}
                    className={`w-full p-2 rounded border ${
                      isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                    }`}
                  >
                    <option value="">Not Specified</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Co-ed">Co-ed</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    {editingTeamId ? 'Update Team' : 'Create Team'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseTeamModal}
                    className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default withAdminAuth(TeamsPage, 'Team Management')