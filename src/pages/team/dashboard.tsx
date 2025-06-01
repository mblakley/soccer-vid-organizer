import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useTeam } from '@/contexts/TeamContext'
import AppLayout from '@/components/AppLayout'
import { useTheme } from '@/contexts/ThemeContext'

interface TeamStats {
  wins: number
  losses: number
  draws: number
  goals_scored: number
  goals_against: number
  clean_sheets: number
}

interface Injury {
  id: string
  player_name: string
  injury_type: string
  expected_return_date: string
  status: 'active' | 'recovered'
  notes?: string
}

export default function TeamDashboard() {
  const router = useRouter()
  const { selectedTeamId, userTeams } = useTeam()
  const { isDarkMode } = useTheme()
  const [teamStats, setTeamStats] = useState<TeamStats>({
    wins: 0,
    losses: 0,
    draws: 0,
    goals_scored: 0,
    goals_against: 0,
    clean_sheets: 0
  })
  const [injuries, setInjuries] = useState<Injury[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedTeamId) {
      router.push('/')
      return
    }

    const fetchTeamData = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(`/api/team/stats?teamId=${selectedTeamId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch team data')
        }
        const data = await response.json()
        setTeamStats(data.stats)
        setInjuries(data.injuries)
      } catch (err: any) {
        console.error('Error fetching team data:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchTeamData()
  }, [selectedTeamId, router])

  const selectedTeam = userTeams.find(team => team.id === selectedTeamId)

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout>
        <div className="text-red-500 text-center p-4">
          Error loading team data: {error}
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">{selectedTeam?.name} Dashboard</h1>
        
        {/* Team Record */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className="text-xl font-semibold mb-4">Team Record</h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-500">{teamStats.wins}</div>
                <div className="text-sm text-gray-500">Wins</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-500">{teamStats.draws}</div>
                <div className="text-sm text-gray-500">Draws</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-500">{teamStats.losses}</div>
                <div className="text-sm text-gray-500">Losses</div>
              </div>
            </div>
          </div>

          {/* Goals Stats */}
          <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className="text-xl font-semibold mb-4">Goals</h2>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-blue-500">{teamStats.goals_scored}</div>
                <div className="text-sm text-gray-500">Scored</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-500">{teamStats.goals_against}</div>
                <div className="text-sm text-gray-500">Against</div>
              </div>
            </div>
          </div>

          {/* Clean Sheets */}
          <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className="text-xl font-semibold mb-4">Clean Sheets</h2>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-500">{teamStats.clean_sheets}</div>
            </div>
          </div>
        </div>

        {/* Injuries Section */}
        <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-800' : 'bg-white'} mb-8`}>
          <h2 className="text-xl font-semibold mb-4">Current Injuries</h2>
          {injuries.length === 0 ? (
            <p className="text-gray-500">No current injuries reported</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead>
                  <tr className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <th className="px-4 py-2 text-left">Player</th>
                    <th className="px-4 py-2 text-left">Injury</th>
                    <th className="px-4 py-2 text-left">Expected Return</th>
                    <th className="px-4 py-2 text-left">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {injuries.map((injury) => (
                    <tr key={injury.id} className="border-t border-gray-200">
                      <td className="px-4 py-2">{injury.player_name}</td>
                      <td className="px-4 py-2">{injury.injury_type}</td>
                      <td className="px-4 py-2">{new Date(injury.expected_return_date).toLocaleDateString()}</td>
                      <td className="px-4 py-2">{injury.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  )
} 