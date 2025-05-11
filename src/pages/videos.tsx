'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import withAuth from '@/components/withAuth'
import { useTheme } from '@/contexts/ThemeContext'

function VideosPage({ user }: { user: any }) {
  const [videos, setVideos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const { isDarkMode } = useTheme()

  useEffect(() => {
    fetchVideos()
  }, [])

  const fetchVideos = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('Error fetching videos:', error)
      } else {
        setVideos(data || [])
      }
    } catch (err) {
      console.error('Exception fetching videos:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatDuration = (seconds: number) => {
    if (!seconds) return 'Unknown'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // Filter videos by search term
  const filteredVideos = videos.filter(video => 
    video.title.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getThumbnailUrl = (video: any) => {
    // First try metadata.thumbnailUrl
    if (video.metadata?.thumbnailUrl) {
      return video.metadata.thumbnailUrl;
    }
    
    // For YouTube videos, construct the URL if we have a video_id
    if (video.source === 'youtube' && video.video_id) {
      return `https://img.youtube.com/vi/${video.video_id}/hqdefault.jpg`;
    }
    
    // Source-specific SVG placeholders
    if (video.source === 'youtube') {
      return '/images/youtube-video.svg';
    }
    
    if (video.source === 'facebook') {
      return '/images/facebook-video.svg';
    }
    
    if (video.source === 'instagram') {
      return '/images/instagram-video.svg';
    }
    
    if (video.source === 'tiktok') {
      return '/images/tiktok-video.svg';
    }
    
    if (video.source === 'veo') {
      return '/images/veo-video.svg';
    }
    
    if (video.source === 'hudl') {
      return '/images/hudl-video.svg';
    }
    
    if (video.source === 'vimeo') {
      return '/images/vimeo-video.svg';
    }
    
    // Fallback to a generic thumbnail
    return '/images/video-placeholder.svg';
  }

  const getVideoUrl = (video: any) => {
    // If URL is stored, use it
    if (video.url) {
      return video.url;
    }
    
    // For YouTube videos, construct the URL if we have a video_id
    if (video.source === 'youtube' && video.video_id) {
      return `https://youtube.com/watch?v=${video.video_id}`;
    }
    
    // Return null if no URL can be determined
    return null;
  }
  
  // Get source display name
  const getSourceName = (video: any) => {
    if (video.source === 'youtube') {
      return 'YouTube';
    }
    
    // Capitalize first letter of source
    return video.source ? video.source.charAt(0).toUpperCase() + video.source.slice(1) : 'Unknown';
  }

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-2xl font-bold">Soccer Videos</h1>
      
      <div className="max-w-md">
        <input
          type="text"
          className={`w-full border rounded px-3 py-2 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
          placeholder="Search videos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      
      {loading ? (
        <p>Loading videos...</p>
      ) : filteredVideos.length === 0 ? (
        searchTerm ? 
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>No videos found matching "{searchTerm}"</p> :
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>No videos have been added yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVideos.map(video => (
            <div 
              key={video.id} 
              className={`border rounded overflow-hidden ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
            >
              <a 
                href={getVideoUrl(video)}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <div className="relative pb-[56.25%]">
                  <img 
                    src={getThumbnailUrl(video)}
                    alt={video.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-1 py-0.5 rounded">
                    {formatDuration(video.duration)}
                  </div>
                </div>
              </a>
              <div className="p-3">
                <h3 className="font-semibold">{video.title}</h3>
                <div className="text-xs text-gray-500 mt-1">
                  Source: {getSourceName(video)}
                </div>
                <div className="mt-2 text-sm">
                  <a 
                    href={getVideoUrl(video)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    Watch Video
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Allow any authenticated user to access this page
export default withAuth(VideosPage, ['admin', 'coach', 'player', 'parent'], 'Soccer Videos') 