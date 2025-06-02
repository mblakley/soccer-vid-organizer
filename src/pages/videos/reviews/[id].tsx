'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { useTheme } from '@/contexts/ThemeContext'
import AppLayout from '@/components/AppLayout'
import { toast } from 'react-toastify'
import { useAuth } from '@/lib/hooks/useAuth'
import { FilmReviewSessionWithClips } from '@/lib/types'
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, MessageSquare } from 'lucide-react'
import VideoPlayer, { VideoPlayerControls } from '@/components/VideoPlayer'
import { Video } from '@/lib/types/videos'
import { ReviewApiResponse, ErrorResponse as ReviewErrorResponse } from '@/lib/types/reviews'
import apiClient from '@/lib/apiClient'

function FilmReviewSessionPageContent() {
  const router = useRouter()
  const { id } = router.query
  const { isDarkMode } = useTheme()
  const { user, loading: authLoading, session: authSessionHook } = useAuth()
  const playerRef = useRef<VideoPlayerControls>(null)
  const timeCheckInterval = useRef<NodeJS.Timeout | null>(null)
  const endTimeTimeout = useRef<NodeJS.Timeout | null>(null)

  const [sessionData, setSessionData] = useState<FilmReviewSessionWithClips | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentClipIndex, setCurrentClipIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      toast.error('Please log in to view film review sessions');
      router.push('/login');
      return;
    }

    if (!id) {
        setError("No review session ID provided.");
        setLoading(false);
        return;
    }

    const fetchReviewSessionData = async () => {
      setLoading(true);
      try {
        console.log('User authenticated, fetching review session...');

        const reviewResponse = await apiClient.get<ReviewApiResponse>(`/api/reviews/${id}`);

        if (reviewResponse && (reviewResponse as ReviewErrorResponse).error) {
          console.error('API error response:', (reviewResponse as ReviewErrorResponse).error);
          throw new Error((reviewResponse as ReviewErrorResponse).error || 'Failed to fetch session');
        }
        
        const successfulResponse = reviewResponse as { review: FilmReviewSessionWithClips }; 

        console.log('Successfully fetched session:', {
          id: successfulResponse.review.id,
          title: successfulResponse.review.title,
          clipCount: successfulResponse.review.clips?.length || 0
        });

        setSessionData(successfulResponse.review);
      } catch (error: any) {
        console.error('Error fetching session:', error);
        toast.error(error.message || 'Failed to fetch session');
        setError(error.message || 'Failed to fetch session');
      } finally {
        setLoading(false);
      }
    };

    fetchReviewSessionData();
  }, [id, user, authLoading, router]);

  const handlePreviousClip = () => {
    if (currentClipIndex > 0) {
      setCurrentClipIndex(prev => prev - 1)
      setIsPlaying(false)
    }
  }

  const handleNextClip = () => {
    if (sessionData && currentClipIndex < sessionData.clips.length - 1) {
      setCurrentClipIndex(prev => prev + 1)
      setIsPlaying(false)
    }
  }

  const togglePlay = () => {
    if (isPlaying) {
      playerRef.current?.pauseVideo()
    } else {
      playerRef.current?.playVideo()
    }
    setIsPlaying(prev => !prev)
  }

  const handlePlayerStateChange = (state: 'playing' | 'paused' | 'ended' | 'buffering' | 'cued') => {
    console.log('Player state changed:', state)
    if (state === 'playing') {
      setIsPlaying(true)
    } else if (state === 'paused' || state === 'ended') {
      setIsPlaying(false)
    }
  }

  const handlePlayerError = (error: any) => {
    console.error('Video player error:', error)
    toast.error('Error playing video')
  }

  const determineVideoSource = (videoId: string): string => {
    // YouTube video IDs are 11 characters long
    if (videoId.length === 11) {
      return 'youtube'
    }
    
    // Veo video IDs are typically longer and contain hyphens
    if (videoId.includes('-')) {
      return 'veo'
    }
    
    // Default to YouTube if we can't determine the source
    return 'youtube'
  }

  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time)
    
    // Log time updates from parent component
    const currentClip = sessionData?.clips[currentClipIndex];
    if (currentClip?.clip?.end_time) {
      const remaining = currentClip.clip.end_time - time;
      
      // Log more frequently as we approach the end
      if (remaining < 5) {
        console.log(`PARENT TIME: ${time.toFixed(2)}/${currentClip.clip.end_time.toFixed(2)}s, Remaining: ${remaining.toFixed(2)}s, Plays: ${isPlaying}`);
      }
      
      // Backup end time check to handle cases where VideoPlayer component fails
      if (time >= currentClip.clip.end_time) {
        console.log(`🔴 PARENT: End time reached at ${time.toFixed(2)}s, end time is ${currentClip.clip.end_time.toFixed(2)}s`);
        
        // Force pause from parent component
        if (playerRef.current && isPlaying) {
          console.log("PARENT: Forcing pause from parent component");
          try {
            // First try regular pause
            playerRef.current.pauseVideo();
            
            // If that doesn't work, try emergency force pause
            setTimeout(() => {
              if (isPlaying) {
                console.log("PARENT: First pause attempt failed, using emergency force pause");
                try {
                  playerRef.current?.forcePause();
                } catch (e) {
                  console.error("Error using force pause:", e);
                }
              }
            }, 100);
          } catch (e) {
            console.error("Error pausing from parent component:", e);
            
            // Try emergency force pause as fallback
            try {
              playerRef.current?.forcePause();
            } catch (forcePauseError) {
              console.error("Error using force pause:", forcePauseError);
            }
          }
          setIsPlaying(false);
        }
      }
    }
  }

  // Add a useEffect to check periodically if we're past the end time
  useEffect(() => {
    // Only run if we're playing and have a current clip
    if (!isPlaying || !sessionData?.clips || !sessionData.clips[currentClipIndex]) return;
    
    const clipEndTime = sessionData.clips[currentClipIndex].clip?.end_time;
    if (!clipEndTime) return;
    
    console.log(`Setting up parent end time check for ${clipEndTime}s`);
    
    // Check every 500ms if we need to force stop
    const forceStopInterval = setInterval(() => {
      if (!playerRef.current || !isPlaying) return;
      
      try {
        const currentTime = playerRef.current.getCurrentTime();
        if (currentTime >= clipEndTime) {
          console.log(`⚠️ PARENT INTERVAL: Forcing stop at ${currentTime}s (end: ${clipEndTime}s)`);
          playerRef.current.forcePause();
          setIsPlaying(false);
        }
      } catch (e) {
        console.error("Error in parent force stop interval:", e);
      }
    }, 500);
    
    return () => clearInterval(forceStopInterval);
  }, [isPlaying, sessionData?.clips, currentClipIndex]);

  const handleClipSelect = (index: number) => {
    console.log(`Selecting clip at index ${index}`);
    
    // First, make sure any existing video is paused
    if (playerRef.current) {
      try {
        playerRef.current.pauseVideo();
      } catch (e) {
        console.error("Error pausing video during clip selection:", e);
      }
    }
    
    // If it's the same clip, just restart it
    if (index === currentClipIndex) {
      console.log(`Restarting same clip at index ${index}`);
      const clip = sessionData?.clips[index];
      if (clip?.clip?.start_time !== undefined && playerRef.current) {
        try {
          setTimeout(() => {
            // First seek to the start time
            playerRef.current?.seekTo(clip.clip!.start_time);
            console.log(`Seeked to start time: ${clip.clip!.start_time}s`);
            
            // Wait a moment after seeking before playing
            setTimeout(() => {
              try {
                // Play the video
                playerRef.current?.playVideo();
                setIsPlaying(true);
                console.log(`Started playing clip from beginning`);
              } catch (playError) {
                console.error("Error playing video after restart:", playError);
              }
            }, 100);
          }, 100);
        } catch (e) {
          console.error("Error seeking to start time:", e);
        }
      }
      return;
    }
    
    // Update the state with the new index
    setCurrentClipIndex(index);
    setIsPlaying(false);
    
    // The player will reinitialize with the new clip settings because of the key property
    console.log(`Switched to clip index ${index}`);
  }

  // Clean up on unmount
  useEffect(() => {
    return () => {
      // No need for complex cleanup logic
    }
  }, [])

  const pageBg = isDarkMode ? 'bg-gray-900' : 'bg-gray-100'
  const cardBg = isDarkMode ? 'bg-gray-800' : 'bg-white'
  const textColor = isDarkMode ? 'text-gray-200' : 'text-gray-800'
  const subduedTextColor = isDarkMode ? 'text-gray-400' : 'text-gray-500'
  const borderColor = isDarkMode ? 'border-gray-700' : 'border-gray-200'

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (!sessionData) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className={`text-xl ${textColor}`}>Session not found</p>
      </div>
    )
  }

  const currentClip = sessionData.clips[currentClipIndex]

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Top Bar */}
      <div className="h-4 bg-gray-900 border-b border-gray-800" />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden w-full h-full">
        {/* Video Area */}
        <div className="flex-1 min-w-0 bg-black flex items-center justify-center relative h-full">
          {!sessionData?.clips || sessionData.clips.length === 0 ? (
            <div className="flex justify-center items-center h-full">
              <div className="text-center p-8">
                <div className="text-gray-400 text-lg mb-4">No clips available in this session</div>
                <div className="text-gray-500 text-sm">This session doesn't contain any video clips.</div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center w-full max-w-full overflow-hidden">
              {sessionData.clips[currentClipIndex]?.clip ? (
                <VideoPlayer
                  ref={playerRef}
                  key={`clip-${sessionData.clips[currentClipIndex].id}`}
                  video={{
                    id: sessionData.clips[currentClipIndex].clip.id,
                    video_id: sessionData.clips[currentClipIndex].clip.video_id,
                    title: sessionData.clips[currentClipIndex].clip.title || '',
                    source: determineVideoSource(sessionData.clips[currentClipIndex].clip.video_id),
                    start_time: sessionData.clips[currentClipIndex].clip.start_time,
                    end_time: sessionData.clips[currentClipIndex].clip.end_time
                  }}
                  onStateChange={handlePlayerStateChange}
                  onTimeUpdate={handleTimeUpdate}
                  onError={handlePlayerError}
                  className="aspect-video bg-black w-full max-w-full"
                />
              ) : (
                <div className="text-gray-400 text-lg">Selected clip not available</div>
              )}
            </div>
          )}
        </div>

        {/* Clips List Section */}
        <div className="w-80 bg-gray-800 border-l border-gray-700 overflow-y-auto">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-gray-200">Session Clips</h2>
          </div>
          <div className="divide-y divide-gray-700">
            {sessionData.clips.map((clip, index) => (
              <div
                key={clip.id}
                className={`p-4 cursor-pointer transition-colors ${
                  index === currentClipIndex
                    ? 'bg-gray-700'
                    : 'hover:bg-gray-700'
                }`}
                onClick={() => handleClipSelect(index)}
              >
                <div className="flex items-start space-x-3">
                  <div className="w-16 h-12 bg-gray-600 rounded overflow-hidden flex-shrink-0">
                    {clip.clip?.thumbnail_url && (
                      <img
                        src={clip.clip.thumbnail_url}
                        alt={clip.clip?.title || 'Video thumbnail'}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-grow">
                    <h3 className="font-medium text-gray-200">{clip.clip?.title || 'Untitled clip'}</h3>
                    <div className="text-sm text-gray-400">
                      {formatTime(clip.clip?.start_time || 0)} - {formatTime(clip.clip?.end_time || 0)}
                    </div>
                    {clip.comment && (
                      <div className="mt-1 flex items-start">
                        <MessageSquare size={14} className="mt-0.5 mr-1 text-gray-400" />
                        <p className="text-sm text-gray-400">{clip.comment}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper function to format time (mm:ss)
const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

export default function VideoReviewPage() {
  return (
    <AppLayout title="Video Review">
      <FilmReviewSessionPageContent />
    </AppLayout>
  )
} 