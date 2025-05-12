import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useTheme } from '@/contexts/ThemeContext'
import { useTeam } from '@/contexts/TeamContext'

type Team = {
  id: string
  name: string
}

export default function UserBanner({ email, roles }: { email: string; roles: string[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const { isDarkMode, toggleTheme } = useTheme()
  const { selectedTeamId, setSelectedTeamId } = useTeam()

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const url = user?.user_metadata?.avatar_url || null
      setAvatarUrl(url)
    }
    fetchProfile()
  }, [])

  useEffect(() => {
    const fetchTeams = async () => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get user's team memberships
      const { data: memberships, error: membershipsError } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id)
      
      if (membershipsError) {
        console.error('Error fetching team memberships:', membershipsError)
        return
      }

      // Fetch team details, excluding System club teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name')
        .neq('club_affiliation', 'System')
        .order('name')
      
      if (teamsError) {
        console.error('Error fetching teams:', teamsError)
        return
      }
      
      setTeams(teamsData || [])

      // If user is only in one team (excluding System club teams), set it as selected
      const nonSystemTeamMemberships = memberships?.filter(m => 
        teamsData?.some(t => t.id === m.team_id)
      ) || []
      
      if (nonSystemTeamMemberships.length === 1) {
        setSelectedTeamId(nonSystemTeamMemberships[0].team_id)
      }
    }
    fetchTeams()
  }, [setSelectedTeamId])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleTeamChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    setSelectedTeamId(value === 'all' ? null : value)
  }

  const initials = email
    ? email
        .split('@')[0]
        .split(/\W+/)
        .map(word => word.charAt(0).toUpperCase())
        .join('')
        .slice(0, 2)
    : '?'

  return (
    <div className="flex items-center justify-end relative">
      <div className="mr-4">
        {teams.length > 0 && (
          teams.length > 1 ? (
            <select
              value={selectedTeamId || 'all'}
              onChange={handleTeamChange}
              className={`px-3 py-1 rounded text-sm ${
                isDarkMode 
                  ? 'bg-gray-700 text-gray-200 border-gray-600' 
                  : 'bg-white text-gray-700 border-gray-300'
              } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              <option value="all">All Teams</option>
              {teams.map(team => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          ) : (
            <div className={`px-3 py-1 text-sm ${
              isDarkMode ? 'text-gray-200' : 'text-gray-700'
            }`}>
              {teams[0]?.name}
            </div>
          )
        )}
      </div>
      <button
        className={`w-10 h-10 rounded-full ${isDarkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} flex items-center justify-center overflow-hidden`}
        onClick={() => setOpen(!open)}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover rounded-full" />
        ) : (
          initials
        )}
      </button>
      {open && (
        <div className={`absolute top-12 right-0 w-56 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-800'} border rounded shadow-md z-10`}>
          <div className={`px-4 py-2 text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>{email}</div>
          <div className={`px-4 py-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Roles: {roles.join(', ') || 'None'}</div>
          <hr className={`my-1 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`} />
          <Link 
            href="/profile"
            className={`block px-4 py-2 text-sm ${isDarkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            Profile
          </Link>
          {roles.includes('admin') && (
            <Link 
              href="/admin/roles"
              className={`block px-4 py-2 text-sm ${isDarkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              Manage Roles
            </Link>
          )}
          <button
            className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleTheme();
            }}
          >
            <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
            <span>{isDarkMode ? '☀️' : '🌙'}</span>
          </button>
          <hr className={`my-1 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`} />
          <button
            className={`w-full text-left px-4 py-2 text-sm ${isDarkMode ? 'text-red-400 hover:bg-gray-700' : 'text-red-600 hover:bg-gray-100'}`}
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  )
}
