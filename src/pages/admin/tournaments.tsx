'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useTheme } from '@/contexts/ThemeContext'
import ThemeToggle from '@/components/ThemeToggle'
import { withAdminAuth } from '@/components/auth'
import { Pencil, Trash2, ArrowLeft } from 'lucide-react'
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

interface Tournament {
  id: string
  name: string
  league_id: string
  start_date: string
  end_date: string
  location: string | null
  status: 'upcoming' | 'in_progress' | 'completed' | 'cancelled'
  format: string | null
  additional_info: any
  created_at: string | null
  updated_at: string | null
}

// Interface for divisions in use
interface TournamentDivision {
  division: string
  team_count: number
}

interface League {
  id: string
  name: string
}

const columnHelper = createColumnHelper<Tournament>()

function TournamentsPage() {
  const router = useRouter()
  const [newTournament, setNewTournament] = useState({
    name: '',
    league_id: '',
    start_date: '',
    end_date: '',
    location: '',
    status: 'upcoming' as 'upcoming' | 'in_progress' | 'completed' | 'cancelled',
    format: '',
    additional_info: {}
  })
  const { isDarkMode } = useTheme()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [leagues, setLeagues] = useState<League[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingLeagues, setLoadingLeagues] = useState(true)
  const [loadingDivisions, setLoadingDivisions] = useState(false)
  const [currentDivisions, setCurrentDivisions] = useState<TournamentDivision[]>([])
  const [editingTournamentId, setEditingTournamentId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [pageError, setPageError] = useState<string | null>(null)
  const [sorting, setSorting] = useState<SortingState>([])
  const [showTournamentModal, setShowTournamentModal] = useState(false)

  // Map of tournament IDs to their divisions currently in use
  const [tournamentDivisionsMap, setTournamentDivisionsMap] = useState<Record<string, string[]>>({})

  const columns = [
    columnHelper.accessor('name', {
      header: 'Name',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('league_id', {
      header: 'League',
      cell: info => {
        const leagueId = info.getValue();
        const league = leagues.find(l => l.id === leagueId);
        return league ? league.name : '-';
      },
    }),
    columnHelper.accessor('location', {
      header: 'Location',
      cell: info => info.getValue() || '-',
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: info => info.getValue(),
    }),
    columnHelper.accessor('format', {
      header: 'Format',
      cell: info => info.getValue() || '-',
    }),
    columnHelper.accessor('start_date', {
      header: 'Start Date',
      cell: info => info.getValue() ? new Date(info.getValue()).toLocaleDateString() : '-',
    }),
    columnHelper.accessor('end_date', {
      header: 'End Date',
      cell: info => info.getValue() ? new Date(info.getValue()).toLocaleDateString() : '-',
    }),
    columnHelper.accessor(row => {
      const divisions = tournamentDivisionsMap[row.id] || [];
      return divisions.join(', ') || '-';
    }, {
      id: 'divisions',
      header: 'Divisions in Use',
      cell: info => info.getValue(),
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
            title="Edit Tournament"
          >
            <Pencil size={20} />
          </button>
          <button
            onClick={() => handleDelete(props.row.original.id)}
            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
            title="Delete Tournament"
          >
            <Trash2 size={20} />
          </button>
        </div>
      ),
    }),
  ]

  const table = useReactTable({
    data: tournaments,
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
    fetchTournaments()
    fetchLeagues()
  }, [])

  useEffect(() => {
    // When tournaments are loaded, fetch current divisions for all tournaments
    if (tournaments.length > 0) {
      fetchAllCurrentDivisions()
    }
  }, [tournaments])

  // Fetch current divisions in use for all tournaments
  const fetchAllCurrentDivisions = async () => {
    try {
      const { data, error } = await supabase
        .from('tournament_teams')
        .select('tournament_id, division')

      if (error) throw error

      // Build a map of tournament ID -> divisions
      const divisionsMap: Record<string, string[]> = {}
      data?.forEach((team) => {
        if (!team.division) return;
        
        if (!divisionsMap[team.tournament_id]) {
          divisionsMap[team.tournament_id] = []
        }
        
        // Add division if it's not already in the array
        if (!divisionsMap[team.tournament_id].includes(team.division)) {
          divisionsMap[team.tournament_id].push(team.division)
        }
      })

      setTournamentDivisionsMap(divisionsMap)
    } catch (error: any) {
      console.error('Error fetching current divisions:', error)
    }
  }

  // Fetch current divisions for a specific tournament
  const fetchCurrentDivisions = async (tournamentId: string) => {
    setLoadingDivisions(true)
    try {
      // First get the list of unique divisions
      const { data: divisionsData, error: divisionsError } = await supabase
        .from('tournament_teams')
        .select('division')
        .eq('tournament_id', tournamentId)
        .not('division', 'is', null);

      if (divisionsError) throw divisionsError;
      
      // Create a map to count teams per division
      const divisionCounts: Record<string, number> = {};
      
      // Count occurrences of each division
      divisionsData.forEach((item: { division: string }) => {
        if (divisionCounts[item.division]) {
          divisionCounts[item.division]++;
        } else {
          divisionCounts[item.division] = 1;
        }
      });
      
      // Convert to our required format
      const divisionsWithCounts: TournamentDivision[] = Object.entries(divisionCounts).map(
        ([division, count]) => ({
          division,
          team_count: count
        })
      );

      setCurrentDivisions(divisionsWithCounts);
    } catch (error: any) {
      console.error('Error fetching current divisions:', error)
    } finally {
      setLoadingDivisions(false)
    }
  }

  const fetchTournaments = async () => {
    setPageError(null)
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select()
        .order('start_date', { ascending: false })

      if (error) throw error

      setTournaments(data || [])
    } catch (error: any) {
      console.error('Error fetching tournaments:', error)
      setPageError(error.message || 'Failed to fetch tournaments.')
    } finally {
      setLoading(false)
    }
  }

  const fetchLeagues = async () => {
    setLoadingLeagues(true)
    try {
      const { data, error } = await supabase
        .from('leagues')
        .select('id, name')
        .order('name')

      if (error) throw error
      setLeagues(data || [])
    } catch (error: any) {
      console.error('Error fetching leagues:', error)
    } finally {
      setLoadingLeagues(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this tournament?')) return

    try {
      const { error } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      toast.success('Tournament deleted successfully')
      fetchTournaments()
    } catch (error: any) {
      console.error('Error deleting tournament:', error)
      toast.error(error.message || 'Error deleting tournament')
    }
  }

  // Handle clicking the Edit button for a tournament
  const handleEditClick = (tournamentToEdit: Tournament) => {
    setEditingTournamentId(tournamentToEdit.id)
    setNewTournament({
      name: tournamentToEdit.name,
      league_id: tournamentToEdit.league_id,
      start_date: tournamentToEdit.start_date ? new Date(tournamentToEdit.start_date).toISOString().split('T')[0] : '',
      end_date: tournamentToEdit.end_date ? new Date(tournamentToEdit.end_date).toISOString().split('T')[0] : '',
      location: tournamentToEdit.location || '',
      status: tournamentToEdit.status,
      format: tournamentToEdit.format || '',
      additional_info: tournamentToEdit.additional_info || {}
    })
    
    // Fetch current divisions for this tournament
    fetchCurrentDivisions(tournamentToEdit.id)
    
    setShowTournamentModal(true)
  }

  // Handle opening the create tournament modal
  const handleCreateClick = () => {
    setEditingTournamentId(null)
    setNewTournament({
      name: '',
      league_id: '',
      start_date: '',
      end_date: '',
      location: '',
      status: 'upcoming' as 'upcoming' | 'in_progress' | 'completed' | 'cancelled',
      format: '',
      additional_info: {}
    })
    setCurrentDivisions([])
    setShowTournamentModal(true)
  }

  // Handle closing the tournament modal
  const handleCloseTournamentModal = () => {
    setShowTournamentModal(false)
    setEditingTournamentId(null)
    setFormError(null)
    setCurrentDivisions([])
  }

  const handleSaveTournament = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    try {
      const tournamentData = {
        name: newTournament.name,
        league_id: newTournament.league_id,
        start_date: newTournament.start_date || null,
        end_date: newTournament.end_date || null,
        location: newTournament.location || null,
        status: newTournament.status,
        format: newTournament.format || null,
        additional_info: newTournament.additional_info || {}
      }

      // Validate required fields
      if (!tournamentData.name) {
        throw new Error('Tournament name is required')
      }
      if (!tournamentData.league_id) {
        throw new Error('Please select a league')
      }
      if (!tournamentData.start_date) {
        throw new Error('Start date is required')
      }
      if (!tournamentData.end_date) {
        throw new Error('End date is required')
      }
      
      // Validate dates
      if (new Date(tournamentData.start_date) > new Date(tournamentData.end_date)) {
        throw new Error('Start date must be before end date')
      }

      if (editingTournamentId) {
        // Update existing tournament
        const { error } = await supabase
          .from('tournaments')
          .update(tournamentData)
          .eq('id', editingTournamentId)
        if (error) throw error
        toast.success('Tournament updated successfully!')
      } else {
        // Create new tournament
        const { data, error } = await supabase
          .from('tournaments')
          .insert([tournamentData])
          .select()
          .single()
        if (error) throw error
        
        toast.success('Tournament created successfully!')
      }

      // Reset form
      setNewTournament({
        name: '',
        league_id: '',
        start_date: '',
        end_date: '',
        location: '',
        status: 'upcoming' as 'upcoming' | 'in_progress' | 'completed' | 'cancelled',
        format: '',
        additional_info: {}
      })
      setCurrentDivisions([])
      setShowTournamentModal(false)
      setEditingTournamentId(null)
      
      // Refresh data
      await fetchTournaments()
      await fetchAllCurrentDivisions()
    } catch (error: any) {
      console.error('Error saving tournament:', error)
      setFormError(error.message || 'Failed to save tournament. Please try again.')
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

        {/* Tournaments List */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">All Tournaments</h2>
            <button
              onClick={handleCreateClick}
              className={`px-4 py-2 rounded-md ${
                isDarkMode
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              Create New Tournament
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

        {/* Tournament Form Modal */}
        {showTournamentModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">
                  {editingTournamentId ? `Edit Tournament: ${tournaments.find(t => t.id === editingTournamentId)?.name || ''}` : 'Create New Tournament'}
                </h3>
                <button
                  onClick={handleCloseTournamentModal}
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

              <form onSubmit={handleSaveTournament} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Tournament Name *</label>
                  <input
                    type="text"
                    value={newTournament.name}
                    onChange={(e) => setNewTournament({ ...newTournament, name: e.target.value })}
                    className={`w-full p-2 rounded border ${
                      isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                    }`}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">League *</label>
                  <select
                    value={newTournament.league_id}
                    onChange={(e) => setNewTournament({ ...newTournament, league_id: e.target.value })}
                    className={`w-full p-2 rounded border ${
                      isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                    }`}
                    required
                  >
                    <option value="">Select a League</option>
                    {leagues.map(league => (
                      <option key={league.id} value={league.id}>
                        {league.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Location</label>
                  <input
                    type="text"
                    value={newTournament.location}
                    onChange={(e) => setNewTournament({ ...newTournament, location: e.target.value })}
                    className={`w-full p-2 rounded border ${
                      isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                    }`}
                    placeholder="e.g., Main Stadium"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Format</label>
                  <input
                    type="text"
                    value={newTournament.format}
                    onChange={(e) => setNewTournament({ ...newTournament, format: e.target.value })}
                    className={`w-full p-2 rounded border ${
                      isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                    }`}
                    placeholder="e.g., Group Stage + Knockout"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Status</label>
                  <select
                    value={newTournament.status}
                    onChange={(e) => setNewTournament({ ...newTournament, status: e.target.value as 'upcoming' | 'in_progress' | 'completed' | 'cancelled' })}
                    className={`w-full p-2 rounded border ${
                      isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                    }`}
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Start Date *</label>
                  <input
                    type="date"
                    value={newTournament.start_date}
                    onChange={(e) => setNewTournament({ ...newTournament, start_date: e.target.value })}
                    className={`w-full p-2 rounded border ${
                      isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                    }`}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">End Date *</label>
                  <input
                    type="date"
                    value={newTournament.end_date}
                    onChange={(e) => setNewTournament({ ...newTournament, end_date: e.target.value })}
                    className={`w-full p-2 rounded border ${
                      isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                    }`}
                    required
                  />
                </div>
                {/* Current divisions section - only shown for existing tournaments */}
                {editingTournamentId && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Divisions Currently In Use</label>
                    
                    {loadingDivisions ? (
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                      </div>
                    ) : currentDivisions.length > 0 ? (
                      <div className={`p-2 rounded ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                        <table className="min-w-full">
                          <thead>
                            <tr>
                              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Division</th>
                              <th className="text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Teams</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-600">
                            {currentDivisions.map((division, index) => (
                              <tr key={index}>
                                <td className="py-2">{division.division}</td>
                                <td className="py-2">{division.team_count}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No divisions are currently in use.</p>
                    )}
                    
                    <div className="mt-2 p-3 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">
                      <p className="text-sm">
                        <b>Note:</b> Divisions are created dynamically when teams register for this tournament. When registering a team, you can specify any division name, and it will be automatically created.
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    {editingTournamentId ? 'Update Tournament' : 'Create Tournament'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCloseTournamentModal}
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

export default withAdminAuth(TournamentsPage, 'Tournament Management') 