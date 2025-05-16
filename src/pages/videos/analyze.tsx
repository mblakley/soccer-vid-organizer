'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { withAuth } from '@/components/auth'
import VideoPlayer, { VideoPlayerControls } from '@/components/VideoPlayer'
import AnalysisSidebar from '@/components/AnalysisSidebar'

export interface Video {
  id: string;
  video_id: string;
  title: string;
  source: string;
  duration?: number;
  url?: string;
}

function AnalyzeVideoPage({ user }: { user: any }) {
  const [videos, setVideos] = useState<Video[]>([])
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [loading, setLoading] = useState(true)
  const [playerReady, setPlayerReady] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [playerState, setPlayerState] = useState<'playing' | 'paused'>('paused')
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null)
  
  const playerRef = useRef<VideoPlayerControls>(null)

  // Load videos on component mount
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('videos')
          .select('*')
          .or(
            'source.eq.youtube,' +
            'and(source.eq.veo,url.not.is.null,url.not.like.%https://app.veo.co%)'
          )
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
    
    fetchVideos()
  }, [])

  // Format time (mm:ss)
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Handle events from the video player
  const handleTimeUpdate = (time: number) => setCurrentTime(time);
  const handlePlayerStateChange = (newState: 'playing' | 'paused' | 'ended' | 'buffering' | 'cued') => {
    if (newState === 'playing') {
      setPlayerState('playing');
    } else if (newState === 'paused' || newState === 'ended') {
      setPlayerState('paused');
    }
  };
  const handlePlayerError = (error: { message?: string; [key: string]: any }) => {
    console.error("Video Player Error:", error);
    setNotification({ message: error.message || 'Video player error', type: 'error' });
    setPlayerReady(false);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Top Bar */}
      <div className="h-4 bg-gray-900 border-b border-gray-800" />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden w-full h-full">
        {/* Video Area */}
        <div className="flex-1 min-w-0 bg-black flex items-center justify-center relative h-full">
          {selectedVideo ? (
            <div className="h-full flex items-center justify-center w-full max-w-full overflow-hidden">
              <VideoPlayer
                ref={playerRef}
                video={selectedVideo}
                onPlayerReady={() => setPlayerReady(true)}
                onTimeUpdate={handleTimeUpdate}
                onStateChange={handlePlayerStateChange}
                onPlay={() => setPlayerState('playing')}
                onPause={() => setPlayerState('paused')}
                onError={handlePlayerError}
                className="aspect-video bg-black w-full max-w-full"
              />
            </div>
          ) : (
            <div className="text-gray-400 text-lg">Select a video to begin</div>
          )}
        </div>

        <AnalysisSidebar
          user={user}
          videos={videos}
          selectedVideo={selectedVideo}
          onVideoSelect={(videoId: string | null) => {
            if (videoId) {
              const video = videos.find(v => v.id === videoId);
              setSelectedVideo(video || null);
            } else {
              setSelectedVideo(null);
            }
          }}
          playerRef={playerRef}
          currentTime={currentTime}
          playerState={playerState}
          formatTime={formatTime}
        />
      </div>

      {/* Notification */}
      {notification && (
        <div className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 p-3 rounded z-50 ${ 
          notification.type === 'success' 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {notification.message}
        </div>
      )}
    </div>
  )
}

// Allow coaches to access this page
export default withAuth(
  AnalyzeVideoPage, 
  {
    teamId: 'any',
    roles: ['coach']
  }, 
  'Analyze Video'
)