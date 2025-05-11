import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useTheme } from '@/contexts/ThemeContext'

export default function UserBanner({ email, roles }: { email: string; roles: string[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const { isDarkMode } = useTheme()

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const url = user?.user_metadata?.avatar_url || null
      setAvatarUrl(url)
    }
    fetchProfile()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
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
    <div className="relative flex justify-end">
      <div className="relative">
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
          <div className={`absolute right-0 mt-2 w-56 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-800'} border rounded shadow-md z-10`}>
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
              className={`w-full text-left px-4 py-2 text-sm ${isDarkMode ? 'text-red-400 hover:bg-gray-700' : 'text-red-600 hover:bg-gray-100'}`}
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
