'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import { useTheme } from '@/contexts/ThemeContext'
import AppLayout from '@/components/AppLayout'
import { toast } from 'react-toastify'
import { useAuth } from '@/lib/hooks/useAuth'
import { supabase } from '@/lib/supabaseClient'
import { FilmReviewSessionWithClips } from '@/lib/types'
import { ArrowLeft, Play, Pause, SkipBack, SkipForward, MessageSquare } from 'lucide-react'
import VideoPlayer, { VideoPlayerControls } from '@/components/VideoPlayer'

function FilmReviewSessionPageContent() {
  const router = useRouter()
  const { id } = router.query
  const { isDarkMode } = useTheme()
  const { user, loading: authLoading } = useAuth()
  const playerRef = useRef<VideoPlayerControls>(null)
  const timeCheckInterval = useRef<NodeJS.Timeout | null>(null)
  const endTimeTimeout = useRef<NodeJS.Timeout | null>(null)

  const [session, setSession] = useState<FilmReviewSessionWithClips | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentClipIndex, setCurrentClipIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)

  useEffect(() => {
    if (!authLoading && !user) {
      toast.error('Please log in to view film review sessions')
      router.push('/login')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (!id) return

    const fetchSession = async () => {
      try {
        console.log('Fetching session with ID:', id)
        
        const { data: { session: authSession }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError || !authSession) {
          console.error('Auth session error:', sessionError)
          throw new Error('Not authenticated')
        }

        console.log('Got auth session, fetching review session...')

        const response = await fetch(`/api/reviews/${id}`, {
          headers: {
            'Authorization': `Bearer ${authSession.access_token}`
          }
        })

        const data = await response.json()

        if (!response.ok) {
          console.error('API error response:', data)
          throw new Error(data.error || data.message || 'Failed to fetch session')
        }

        console.log('Successfully fetched session:', {
          id: data.id,
          title: data.title,
          clipCount: data.clips?.length || 0
        })

        setSession(data)
      } catch (error: any) {
        console.error('Error fetching session:', error)
        toast.error(error.message || 'Failed to fetch session')
      } finally {
        setLoading(false)
      }
    }

    fetchSession()
  }, [id])

  const handlePreviousClip = () => {
    if (currentClipIndex > 0) {
      setCurrentClipIndex(prev => prev - 1)
      setIsPlaying(false)
    }
  }

  const handleNextClip = () => {
    if (session && currentClipIndex < session.clips.length - 1) {
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
      
      // Set a timeout to forcefully pause at the end time when playing starts
      const currentClip = session?.clips[currentClipIndex]
      if (currentClip && playerRef.current) {
        const currentVideoTime = playerRef.current.getCurrentTime()
        const timeUntilEnd = currentClip.clip.end_time - currentVideoTime
        
        if (timeUntilEnd > 0) {
          // Clear any existing timeout
          if (endTimeTimeout.current) {
            clearTimeout(endTimeTimeout.current)
          }
          
          console.log(`Setting timeout to stop video after ${timeUntilEnd} seconds from current time`)
          endTimeTimeout.current = setTimeout(() => {
            console.log('Timeout triggered, stopping video')
            playerRef.current?.pauseVideo()
            setIsPlaying(false)
          }, timeUntilEnd * 1000 + 100) // Add a small buffer
        }
      }
    } else if (state === 'paused' || state === 'ended') {
      setIsPlaying(false)
      // Clear timeout when paused or ended
      if (endTimeTimeout.current) {
        clearTimeout(endTimeTimeout.current)
        endTimeTimeout.current = null
      }
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
    
    // Check if we've reached the end time of the current clip
    const currentClip = session?.clips[currentClipIndex]
    if (currentClip && time >= currentClip.clip.end_time) {
      console.log(`Force stopping video at ${time}, end time is ${currentClip.clip.end_time}`)
      playerRef.current?.pauseVideo()
      setIsPlaying(false)
    }
  }

  const handleClipSelect = (index: number) => {
    // Clear any existing interval and timeout
    if (timeCheckInterval.current) {
      clearInterval(timeCheckInterval.current)
      timeCheckInterval.current = null
    }
    
    if (endTimeTimeout.current) {
      clearTimeout(endTimeTimeout.current)
      endTimeTimeout.current = null
    }

    setCurrentClipIndex(index)
    setIsPlaying(false)

    // Wait for the player to be ready before seeking
    const checkPlayerReady = setInterval(() => {
      if (playerRef.current) {
        clearInterval(checkPlayerReady)
        const clip = session?.clips[index]
        if (clip) {
          console.log(`Starting clip at ${clip.clip.start_time}, will end at ${clip.clip.end_time}`)
          playerRef.current.seekTo(clip.clip.start_time)
          
          // Set a timeout to forcefully pause at the end time
          const duration = clip.clip.end_time - clip.clip.start_time
          if (duration > 0) {
            console.log(`Setting timeout to stop video after ${duration} seconds`)
            endTimeTimeout.current = setTimeout(() => {
              console.log('Timeout triggered, stopping video')
              playerRef.current?.pauseVideo()
              setIsPlaying(false)
            }, duration * 1000 + 100) // Add a small buffer to ensure we catch it
          }
        }
      }
    }, 100)
  }

  // Clean up interval and timeout on unmount
  useEffect(() => {
    return () => {
      if (timeCheckInterval.current) {
        clearInterval(timeCheckInterval.current)
      }
      if (endTimeTimeout.current) {
        clearTimeout(endTimeTimeout.current)
      }
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

  if (!session) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className={`text-xl ${textColor}`}>Session not found</p>
      </div>
    )
  }

  const currentClip = session.clips[currentClipIndex]

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Top Bar */}
      <div className="h-4 bg-gray-900 border-b border-gray-800" />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden w-full h-full">
        {/* Video Area */}
        <div className="flex-1 min-w-0 bg-black flex items-center justify-center relative h-full">
          {currentClip ? (
            <div className="h-full flex items-center justify-center w-full max-w-full overflow-hidden">
              <VideoPlayer
                ref={playerRef}
                video={{
                  id: currentClip.clip.id,
                  video_id: currentClip.clip.video_id,
                  title: currentClip.clip.title,
                  source: determineVideoSource(currentClip.clip.video_id),
                  start_time: currentClip.clip.start_time,
                  end_time: currentClip.clip.end_time
                }}
                onStateChange={handlePlayerStateChange}
                onTimeUpdate={handleTimeUpdate}
                onError={handlePlayerError}
                className="aspect-video bg-black w-full max-w-full"
              />
            </div>
          ) : (
            <div className="text-gray-400 text-lg">No clips available</div>
          )}
        </div>

        {/* Clips List Section */}
        <div className="w-80 bg-gray-800 border-l border-gray-700 overflow-y-auto">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold text-gray-200">Session Clips</h2>
          </div>
          <div className="divide-y divide-gray-700">
            {session.clips.map((clip, index) => (
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
                    {clip.clip.thumbnail_url && (
                      <img
                        src={clip.clip.thumbnail_url}
                        alt={clip.clip.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-grow">
                    <h3 className="font-medium text-gray-200">{clip.clip.title}</h3>
                    <div className="text-sm text-gray-400">
                      {formatTime(clip.clip.start_time)} - {formatTime(clip.clip.end_time)}
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

export default function FilmReviewSessionPage() {
  return (
    <AppLayout title="Film Review Session">
      <FilmReviewSessionPageContent />
    </AppLayout>
  )
} 