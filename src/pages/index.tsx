'use client'
import { useEffect, useState } from 'react'
import ClipPlayer from '@/components/ClipPlayer'
import { supabase } from '@/lib/supabaseClient'
import { withAuth } from '@/components/auth'
import { useTheme } from '@/contexts/ThemeContext'
import Link from 'next/link'

interface VideoInfo {
  video_id: string;
  source: string;
}

interface Video {
  id: string;
  video_id: string;
  title: string;
  source: string;
  duration?: number;
  metadata?: any;
  url?: string;
  created_at: string;
}

function HomePage({ user }: { user: any }) {
  const [clips, setClips] = useState<any[]>([])
  const [videos, setVideos] = useState<Video[]>([])
  const [videoSources, setVideoSources] = useState<Record<string, string>>({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [comments, setComments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const { isDarkMode } = useTheme()

  useEffect(() => {
    const fetchData = async () => {
      // Fetch clips
      const { data: clipsData, error: clipsError } = await supabase
        .from('clips')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

      if (clipsError) {
        console.error('Error fetching clips:', clipsError)
      } else {
        console.log('Fetched clips:', clipsData)
        setClips(clipsData || [])
        
        // Collect unique video IDs to fetch their sources
        if (clipsData && clipsData.length > 0) {
          const uniqueVideoIds = [...new Set(clipsData.map(clip => clip.video_id))]
          fetchVideoSources(uniqueVideoIds)
        }
      }

      // Fetch videos
      const { data: videosData, error: videosError } = await supabase
        .from('videos')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(6)
      
      if (videosError) {
        console.error('Error fetching videos:', videosError)
      } else {
        setVideos(videosData || [])
      }
      
      setLoading(false)
    }
    
    fetchData()
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

  const getThumbnailUrl = (video: Video) => {
    // First try metadata.thumbnailUrl
    if (video.metadata?.thumbnailUrl) {
      return video.metadata.thumbnailUrl;
    }
    
    // For YouTube videos, construct the URL if we have a video_id
    if (video.source === 'youtube' && video.video_id) {
      return `https://img.youtube.com/vi/${video.video_id}/hqdefault.jpg`;
    }
    
    // Fallback to a generic thumbnail based on source
    if (video.source === 'youtube') return '/images/youtube-video.svg';
    if (video.source === 'facebook') return '/images/facebook-video.svg';
    if (video.source === 'instagram') return '/images/instagram-video.svg';
    if (video.source === 'tiktok') return '/images/tiktok-video.svg';
    if (video.source === 'veo') return '/images/veo-video.svg';
    if (video.source === 'hudl') return '/images/hudl-video.svg';
    if (video.source === 'vimeo') return '/images/vimeo-video.svg';
    
    // Fallback to a generic thumbnail
    return '/images/video-placeholder.svg';
  }

  const getVideoUrl = (video: Video) => {
    // If URL is stored, use it
    if (video.url) {
      return video.url;
    }
    
    // For YouTube videos, construct the URL if we have a video_id
    if (video.source === 'youtube' && video.video_id) {
      return `https://youtube.com/watch?v=${video.video_id}`;
    }
    
    // Return empty string if no URL can be determined
    return '';
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Unknown';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  if (loading) return <p className="p-8">Loading content...</p>

  return (
    <div className="p-8 space-y-8">
      {/* Recent Clips Section */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Recent Clips</h2>
          <Link 
            href="/clips" 
            className="text-blue-600 hover:underline"
          >
            View All Clips
          </Link>
        </div>

        {clips.length === 0 ? (
          <p className="py-4">No clips available yet.</p>
        ) : (
          <div>
            <h3 className="text-xl font-semibold mb-3">{clips[currentIndex]?.title}</h3>
            <ClipPlayer 
              videoId={clips[currentIndex]?.video_id} 
              start={clips[currentIndex]?.start_time} 
              end={clips[currentIndex]?.end_time} 
              source={videoSources[clips[currentIndex]?.video_id] || 'youtube'} 
            />
            
            <ul className="list-disc list-inside space-y-1 mt-3">
              {comments.filter(c => c.role_visibility === 'both' || c.role_visibility === user.role).map(c => (
                <li key={c.id}>{c.content}</li>
              ))}
            </ul>
            
            <div className="space-x-2 mt-3">
              <button 
                className={`${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} px-4 py-2 rounded transition-colors`} 
                onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
                disabled={currentIndex === 0}
              >
                Prev
              </button>
              <button 
                className={`${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'} px-4 py-2 rounded transition-colors`} 
                onClick={() => setCurrentIndex(i => Math.min(clips.length - 1, i + 1))}
                disabled={currentIndex === clips.length - 1}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Recent Videos Section */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Recent Videos</h2>
          <Link 
            href="/videos" 
            className="text-blue-600 hover:underline"
          >
            View All Videos
          </Link>
        </div>

        {videos.length === 0 ? (
          <p className="py-4">No videos available yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {videos.map(video => (
              <div 
                key={video.id} 
                className={`border rounded overflow-hidden ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
              >
                <a 
                  href={getVideoUrl(video) || '#'}
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
                    Source: {video.source ? video.source.charAt(0).toUpperCase() + video.source.slice(1) : 'Unknown'}
                  </div>
                  <div className="mt-2 text-sm">
                    <a 
                      href={getVideoUrl(video) || '#'}
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
      </section>
    </div>
  )
}

// Allow any authenticated user to access this page
export default withAuth(
  HomePage, 
  {
    teamId: 'any',
    roles: ['coach', 'player', 'parent']
  }, 
  'Soccer Videos'
)
