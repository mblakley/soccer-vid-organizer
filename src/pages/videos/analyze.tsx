'use client'
import { useState, useEffect, useRef } from 'react'
import { withAuth } from '@/components/auth'
import VideoPlayer, { VideoPlayerControls } from '@/components/VideoPlayer'
import AnalysisSidebar from '@/components/AnalysisSidebar'
import { apiClient } from '@/lib/api/client'
import { ListVideosApiResponse, Video } from '@/lib/types/videos'
import { ErrorResponse } from '@/lib/types/api'

// Add type for comment API responses
interface CommentApiResponse {
  error?: string;
  success?: boolean;
}

function AnalyzeVideoPage({ user }: { user: any }) {
  const [videos, setVideos] = useState<Video[]>([])
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [loading, setLoading] = useState(true)
  const [playerReady, setPlayerReady] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [playerState, setPlayerState] = useState<'playing' | 'paused'>('paused')
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const playerRef = useRef<VideoPlayerControls>(null)

  // Add type guard for video
  const isValidVideo = (video: Video | null): video is Video & { video_id: string } => {
    return video !== null && typeof video.video_id === 'string';
  };

  // Load videos on component mount
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true)
        const response = await apiClient.get<ListVideosApiResponse>('/api/videos/list')
        
        if ('message' in response) {
          console.error('Error fetching videos:', response.message)
        } else if ('videos' in response) {
          setVideos(response.videos || [])
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

  // Replace the fetchVideo function
  const fetchVideo = async () => {
    setLoading(true)
    try {
      const response = await apiClient.get<Video | ErrorResponse>(`/api/videos/${selectedVideo?.id}`)
      if ('error' in response) {
        console.error('Error fetching video:', response.error)
        setError(response.error || 'Failed to fetch video')
      } else {
        setSelectedVideo(response)
      }
    } catch (err: any) {
      console.error('Exception fetching video:', err)
      setError(err.message || 'An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Replace the handleAddComment function
  const handleAddComment = async (commentData: any) => {
    try {
      const response = await apiClient.post<CommentApiResponse>('/api/comments/create', {
        ...commentData,
        video_id: selectedVideo?.id
      })
      
      if (response.error) throw new Error(response.error)
      
      fetchVideo() // Refresh to get updated comments
    } catch (err: any) {
      console.error('Error adding comment:', err)
      setError(err.message || 'Failed to add comment')
    }
  }

  // Replace the handleDeleteComment function
  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return
    
    try {
      const response = await apiClient.post<CommentApiResponse>(`/api/comments/${commentId}`, null)
      
      if (response.error) throw new Error(response.error)
      
      fetchVideo() // Refresh to get updated comments
    } catch (err: any) {
      console.error('Error deleting comment:', err)
      setError(err.message || 'Failed to delete comment')
    }
  }

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
              {isValidVideo(selectedVideo) ? (
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
              ) : (
                <div className="text-gray-400 text-lg">Video ID is required</div>
              )}
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