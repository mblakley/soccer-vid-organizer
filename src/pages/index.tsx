'use client'
import { useEffect, useState } from 'react'
import ClipPlayer from '@/components/ClipPlayer'
import { supabase } from '@/lib/supabaseClient'
import withAuth from '@/components/withAuth'
import { useTheme } from '@/contexts/ThemeContext'

function HomePage({ user }: { user: any }) {
  const [clips, setClips] = useState<any[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [comments, setComments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { isDarkMode } = useTheme()

  useEffect(() => {
    const fetchClips = async () => {
      const { data } = await supabase.from('clips').select('*')
      setClips(data || [])
      setLoading(false)
    }
    fetchClips()
  }, [])

  useEffect(() => {
    const fetchComments = async () => {
      const currentClip = clips[currentIndex]
      if (currentClip) {
        const { data } = await supabase
          .from('comments')
          .select('*')
          .eq('clip_id', currentClip.id)
        setComments(data || [])
      }
    }
    fetchComments()
  }, [currentIndex, clips])

  if (loading || !clips.length) return <p className="p-8">Loading clips...</p>

  const current = clips[currentIndex]

  return (
    <div className="p-8 space-y-4">
      <h2 className="text-xl font-semibold">{current.title}</h2>
      <ClipPlayer videoId={current.video_id} start={current.start_time} end={current.end_time} />
      <ul className="list-disc list-inside space-y-1">
        {comments.filter(c => c.role_visibility === 'both' || c.role_visibility === user.role).map(c => (
          <li key={c.id}>{c.content}</li>
        ))}
      </ul>
      <div className="space-x-2">
        <button 
          className={`${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} px-4 py-2 rounded transition-colors`} 
          onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
        >
          Prev
        </button>
        <button 
          className={`${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} px-4 py-2 rounded transition-colors`} 
          onClick={() => setCurrentIndex(i => Math.min(clips.length - 1, i + 1))}
        >
          Next
        </button>
      </div>
    </div>
  )
}

// Allow any authenticated user to access this page
export default withAuth(HomePage, ['admin', 'coach', 'player', 'parent'], 'Soccer Videos')
