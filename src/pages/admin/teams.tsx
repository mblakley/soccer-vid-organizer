'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useTheme } from '@/contexts/ThemeContext'
import ThemeToggle from '@/components/ThemeToggle'
import { withAdminAuth } from '@/components/auth'
import { User } from '@supabase/supabase-js'
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
  gender?: 'Male' | 'Female' | 'Co-ed' | 'Other' | null
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

const columnHelper = createColumnHelper<Team>()

function TeamsPage() {
  const router = useRouter()
  const [newTeam, setNewTeam] = useState({
    name: '',
    club_affiliation: '',
    season: '',
    age_group: '',
    gender: '',
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

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null);
    try {
      const { data, error } = await supabase
        .from('teams')
        .insert([{
          name: newTeam.name,
          club_affiliation: newTeam.club_affiliation || null,
          season: newTeam.season || null,
          age_group: newTeam.age_group || null,
          gender: newTeam.gender || null,
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
        gender: '',
        additional_info: {}
      })

      // Refresh the teams list
      await fetchTeams()

      toast.success('Team created successfully!')
    } catch (error: any) {
      console.error('Error creating team:', error)
      setFormError(error.message || 'Failed to create team. Please try again.');
    }
  }

  const fetchTeams = async () => {
    setPageError(null);
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('teams')
        .select()
        .neq('club_affiliation', 'System')

      if (error) throw error

      setTeams(data)
    } catch (error: any) {
      console.error('Error fetching teams:', error)
      setPageError(error.message || 'Failed to fetch teams.');
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
    setEditingTeamId(null);
    setNewTeam({
      name: '',
      club_affiliation: '',
      season: '',
      age_group: '',
      gender: '',
      additional_info: {}
    });
    setShowTeamModal(true);
  };

  // Handle closing the team modal
  const handleCloseTeamModal = () => {
    setShowTeamModal(false);
    setEditingTeamId(null);
    setFormError(null);
  };

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null);
    try {
      const teamData = {
        name: newTeam.name,
        club_affiliation: newTeam.club_affiliation || null,
        season: newTeam.season || null,
        age_group: newTeam.age_group || null,
        gender: newTeam.gender || null,
        additional_info: newTeam.additional_info
      };

      if (editingTeamId) {
        // Update existing team
        const { error } = await supabase
          .from('teams')
          .update(teamData)
          .eq('id', editingTeamId)
        if (error) throw error
        toast.success('Team updated successfully!');
        setEditingTeamId(null); // Exit edit mode
      } else {
        // Create new team
        const { data, error } = await supabase
          .from('teams')
          .insert([teamData])
          .select()
          .single()
        if (error) throw error
        toast.success('Team created successfully!');
      }

      // Reset form
      setNewTeam({
        name: '',
        club_affiliation: '',
        season: '',
        age_group: '',
        gender: '',
        additional_info: {}
      })

      await fetchTeams() // Refresh the teams list
    } catch (error: any) {
      console.error('Error saving team:', error)
      setFormError(error.message || 'Failed to save team. Please try again.');
    }
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

        {/* Teams List */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">All Teams</h2>
            <button
              onClick={handleCreateClick}
              className={`px-4 py-2 rounded-md ${
                isDarkMode
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              Create New Team
            </button>
          </div>
          {pageError && (
            <div className={`mb-4 p-3 text-sm rounded ${isDarkMode ? 'bg-red-800 text-red-200' : 'bg-red-100 text-red-700'}`} role="alert">
              {pageError}
            </div>
          )}
          {loading ? (
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className={`min-w-full divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                <thead className={isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}>
                  {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map(header => (
                        <th
                          key={header.id}
                          className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-500'
                          }`}
                        >
                          {header.isPlaceholder ? null : (
                            <div
                              {...{
                                className: header.column.getCanSort()
                                  ? 'cursor-pointer select-none'
                                  : '',
                                onClick: header.column.getToggleSortingHandler(),
                              }}
                            >
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                              {{
                                asc: ' 🔼',
                                desc: ' 🔽',
                              }[header.column.getIsSorted() as string] ?? null}
                            </div>
                          )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700 bg-gray-900' : 'divide-gray-200 bg-white'}`}>
                  {table.getRowModel().rows.map(row => (
                    <tr key={row.id}>
                      {row.getVisibleCells().map(cell => (
                        <td
                          key={cell.id}
                          className={`px-6 py-4 whitespace-nowrap text-sm ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-500'
                          }`}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                className={`px-3 py-1 rounded ${
                  isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'
                }`}
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
              >
                {'<<'}
              </button>
              <button
                className={`px-3 py-1 rounded ${
                  isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'
                }`}
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
              >
                {'<'}
              </button>
              <button
                className={`px-3 py-1 rounded ${
                  isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'
                }`}
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
              >
                {'>'}
              </button>
              <button
                className={`px-3 py-1 rounded ${
                  isDarkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-700'
                }`}
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
              >
                {'>>'}
              </button>
            </div>
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Page {table.getState().pagination.pageIndex + 1} of{' '}
              {table.getPageCount()}
            </span>
          </div>
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