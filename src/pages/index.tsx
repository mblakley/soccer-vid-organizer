'use client'
import { useEffect, useState } from 'react'
import ClipPlayer from '@/components/ClipPlayer'
import { supabase } from '@/lib/supabaseClient'
import withAuth from '@/components/withAuth'
import { useTheme } from '@/contexts/ThemeContext'

interface VideoInfo {
  video_id: string;
  source: string;
}

function HomePage({ user }: { user: any }) {
  const [clips, setClips] = useState<any[]>([])
  const [videoSources, setVideoSources] = useState<Record<string, string>>({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [comments, setComments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { isDarkMode } = useTheme()

  useEffect(() => {
    const fetchClips = async () => {
      const { data, error } = await supabase.from('clips').select('*')
      if (error) {
        console.error('Error fetching clips:', error)
      } else {
        console.log('Fetched clips:', data)
        setClips(data || [])
        
        // Collect unique video IDs to fetch their sources
        if (data && data.length > 0) {
          const uniqueVideoIds = [...new Set(data.map(clip => clip.video_id))]
          fetchVideoSources(uniqueVideoIds)
        }
      }
      setLoading(false)
    }
    fetchClips()
  }, [])
  
  const fetchVideoSources = async (videoIds: string[]) => {
    try {
      // Query the videos table to get the source for each video_id
      const { data, error } = await supabase
        .from('videos')
        .select('video_id, source')
        .in('video_id', videoIds)
      
      if (error) {
        console.error('Error fetching video sources:', error)
        return
      }
      
      // Create a map of video_id to source
      const sourcesMap: Record<string, string> = {}
      data?.forEach((video: VideoInfo) => {
        sourcesMap[video.video_id] = video.source
      })
      
      setVideoSources(sourcesMap)
    } catch (err) {
      console.error('Exception fetching video sources:', err)
    }
  }

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

  if (loading) return <p className="p-8">Loading clips...</p>

  if (!clips.length) {
    return (
      <div className="p-8 space-y-4">
        <h1 className="text-2xl font-semibold">Soccer Videos</h1>
        <p>No clips available yet.</p>
        <div className="mt-4">
          <a 
            href="/videos" 
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded inline-block"
          >
            Browse Full Videos
          </a>
        </div>
      </div>
    )
  }

  const current = clips[currentIndex]
  // Get the source of the current clip's video, default to 'youtube' for backward compatibility
  const videoSource = videoSources[current.video_id] || 'youtube'

  return (
    <div className="p-8 space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">{current.title}</h2>
        <a 
          href="/videos" 
          className="text-blue-600 hover:underline"
        >
          Browse Full Videos
        </a>
      </div>
      <ClipPlayer videoId={current.video_id} start={current.start_time} end={current.end_time} source={videoSource} />
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
