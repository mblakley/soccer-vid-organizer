import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useTheme } from '@/contexts/ThemeContext'
import { useTeam } from '@/contexts/TeamContext'

export default function UserBanner({ email, roles }: { email: string; roles: string[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [showInitials, setShowInitials] = useState(false)
  const { isDarkMode, toggleTheme } = useTheme()
  const { selectedTeamId, setSelectedTeamId, userTeams, isLoadingUser, currentUser } = useTeam()

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      // Get avatar URL from user metadata (works for Google accounts)
      let url = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null
      
      // If it's a Google avatar URL, modify it to get a larger version
      if (url && url.includes('googleusercontent.com')) {
        // Remove any size parameters and add a larger size
        url = url.replace(/=s\d+-c/, '=s192-c')
      }
      
      console.log('Avatar URL:', url) // Debug log
      setAvatarUrl(url)
      setShowInitials(!url) // Show initials if no URL
    }
    fetchProfile()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handleTeamChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    const newTeamId = value === 'all' ? null : value
    
    // Save selected team ID to localStorage for persistence
    if (newTeamId) {
      localStorage.setItem('current_team_id', newTeamId)
    } else {
      localStorage.removeItem('current_team_id')
    }
    
    setSelectedTeamId(newTeamId)
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
        {isLoadingUser ? (
          <div className={`px-3 py-1 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Loading teams...</div>
        ) : userTeams.length > 0 && (
          userTeams.length > 1 ? (
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
              {userTeams.map(team => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          ) : (
            <div className={`px-3 py-1 text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
              {userTeams[0]?.name}
            </div>
          )
        )}
      </div>
      <button
        className={`w-10 h-10 rounded-full ${isDarkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'} flex items-center justify-center overflow-hidden`}
        onClick={() => setOpen(!open)}
      >
        {avatarUrl && !showInitials ? (
          <img 
            src={avatarUrl} 
            alt="avatar" 
            className="w-full h-full object-cover"
            onError={() => {
              console.log('Avatar image failed to load, falling back to initials') // Debug log
              setShowInitials(true)
            }}
          />
        ) : (
          <span className="text-sm font-medium">{initials}</span>
        )}
      </button>
      
      {open && (
        <div className={`absolute top-12 right-0 w-56 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-800'} border rounded shadow-md z-10`}>
          <div className={`px-4 py-2 text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>{email}</div>
          <div className={`px-4 py-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Global Roles: {roles.join(', ') || 'None'}</div>
          {selectedTeamId && userTeams.find(t => t.id === selectedTeamId) && (
            <div className={`px-4 py-1 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {userTeams.find(t => t.id === selectedTeamId)?.name} Roles: {userTeams.find(t => t.id === selectedTeamId)?.roles.join(', ') || 'None'}
            </div>
          )}
          <hr className={`my-1 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`} />
          <Link 
            href="/profile"
            className={`block px-4 py-2 text-sm ${isDarkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}
          >
            Profile
          </Link>
          {currentUser?.isAdmin && (
            <Link 
              href="/admin"
              className={`block px-4 py-2 text-sm ${isDarkMode ? 'text-gray-200 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100'}`}
            >
              Admin Dashboard
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
