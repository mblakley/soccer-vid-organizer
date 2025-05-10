import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/router'

export default function UserBanner({ email, roles }: { email: string; roles: string[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

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
          className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-300 overflow-hidden"
          onClick={() => setOpen(!open)}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover rounded-full" />
          ) : (
            initials
          )}
        </button>
        {open && (
          <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded shadow-md z-10">
            <div className="px-4 py-2 text-sm text-gray-700">{email}</div>
            <div className="px-4 py-1 text-xs text-gray-500">Roles: {roles.join(', ')}</div>
            <hr className="my-1" />
            <button
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
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
