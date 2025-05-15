'use client'
import { useState, useEffect, useRef, Fragment } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { withAuth } from '@/components/auth'
import { useTheme } from '@/contexts/ThemeContext'
import { useRouter } from 'next/router'
import { toast } from 'react-toastify'
import ClipPlayer from '@/components/ClipPlayer'
import TimersSection from '@/components/timers/TimersSection'
import { PlayerTimer, TimerSession } from '@/components/timers/TimerInterfaces'
import CountersSection from '@/components/counters/CountersSection'
// Only imported for types, no longer using the implementation directly
import type { CounterType, CountTracker } from '@/components/counters/CounterInterfaces'

// Add import for YouTube types
// The types are automatically included from @types/youtube

interface Video {
  id: string;
  video_id: string;
  title: string;
  source: string;
  duration?: number;
  url?: string;
}

// Add Veo player interface
interface VeoPlayer {
  getCurrentTime: () => number;
  seekTo: (seconds: number) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  getPlayerState: () => number;
}

interface ClipMarker {
  id: string;
  startTime: number;
  endTime: number;
  title: string;
  comment: string;
  labels: string[];
}

// Now using imported CounterType and CountTracker from '@/components/counters/CounterInterfaces'
// Now using imported PlayerTimer and TimerSession from '@/components/timers/TimerInterfaces'

function AnalyzeVideoPage({ user }: { user: any }) {
  const router = useRouter()
  const { isDarkMode } = useTheme()
  const [videos, setVideos] = useState<Video[]>([])
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingClips, setLoadingClips] = useState(false)
  const [playerReady, setPlayerReady] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [playerState, setPlayerState] = useState<'playing' | 'paused'>('paused')
  const [isRecording, setIsRecording] = useState(false)
  const [recordingStart, setRecordingStart] = useState<number | null>(null)
  const [clipMarkers, setClipMarkers] = useState<ClipMarker[]>([])
  const [clipTitle, setClipTitle] = useState('')
  const [clipComment, setClipComment] = useState('')
  const [clipLabels, setClipLabels] = useState<string[]>([])
  const [newLabel, setNewLabel] = useState('')
  const [showClipForm, setShowClipForm] = useState(false)
  const [isSavingClip, setIsSavingClip] = useState(false)
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null)
  
  // For player form modal
  const [showAddPlayerForm, setShowAddPlayerForm] = useState(false)
  const [selectedCounterId, setSelectedCounterId] = useState<string | null>(null)
  const [selectedTimerId, setSelectedTimerId] = useState<string | null>(null)
  const [addPlayerName, setAddPlayerName] = useState('')
  const [onConfirmAddPlayerForModal, setOnConfirmAddPlayerForModal] = useState<((playerName: string) => void) | null>(null)
  
  // YouTube player reference
  const playerRef = useRef<any>(null)
  const playerContainerRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Track if we should show the fixed buttons
  const shouldShowFixedButtons = selectedVideo && playerReady && !isRecording && !showClipForm

  // Track all used labels for suggestions
  const [recentLabels, setRecentLabels] = useState<string[]>([])
  // Track clip duration
  const [clipDuration, setClipDuration] = useState<number>(0)

  // Track which sidebar tab is active
  const [sidebarTab, setSidebarTab] = useState<'clips' | 'counters' | 'createClip' | 'timers' | null>('clips')
  const [lastSidebarTab, setLastSidebarTab] = useState<'clips' | 'counters' | 'createClip' | 'timers'>('clips')

  // Timer for recording duration
  const [recordingElapsed, setRecordingElapsed] = useState(0)

  // State to show/hide the right sidebar
  const [sidebarVisible, setSidebarVisible] = useState(true)

  // Add new state for confirmation modal
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null)

  // Debounce state for arrow key seeking
  const lastSeekTimeRef = useRef<number>(0);

  // When sidebarVisible changes, clear or restore the selected tab
  useEffect(() => {
    if (!sidebarVisible) {
      if (sidebarTab) setLastSidebarTab(sidebarTab)
      setSidebarTab(null)
    } else if (sidebarTab === null) {
      setSidebarTab(lastSidebarTab)
    }
  }, [sidebarVisible])

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
    
    // Load YouTube API
    if (typeof window !== 'undefined') {
      // Check if YouTube iframe API is already loaded
      if (!window.YT) {
        const tag = document.createElement('script')
        tag.src = 'https://www.youtube.com/iframe_api'
        const firstScriptTag = document.getElementsByTagName('script')[0]
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
      }
    }
    
    return () => {
      // Clean up interval on unmount
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])
  
  // Initialize player when selected video changes
  useEffect(() => {
    if (!selectedVideo) return
    
    // Check if video source is supported
    if (
      selectedVideo.source !== 'youtube' &&
      selectedVideo.source !== 'veo' &&
      selectedVideo.source !== 'facebook'
    ) {
      setNotification({
        message: 'Only YouTube, Veo, and Facebook videos are currently supported for analysis',
        type: 'error'
      })
      return
    }

    let messageHandler: ((event: MessageEvent) => void) | null = null;
    let iframeElement: HTMLIFrameElement | null = null;

    const initializePlayer = () => {
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }

      if (selectedVideo.source === 'youtube') {
        // Make sure the YouTube API is available
        if (typeof window !== 'undefined' && window.YT && window.YT.Player) {
          if (playerContainerRef.current) {
            // Clear the container
            playerContainerRef.current.innerHTML = ''
            
            // Create a new div for the player
            const playerDiv = document.createElement('div')
            playerDiv.id = 'youtube-player'
            playerContainerRef.current.appendChild(playerDiv)
            
            // Create the player
            playerRef.current = new window.YT.Player('youtube-player', {
              videoId: selectedVideo.video_id,
              height: '100%',
              width: '100%',
              playerVars: {
                autoplay: 0,
                controls: 1,
                modestbranding: 1,
                rel: 0
              },
              events: {
                onReady: () => {
                  setPlayerReady(true)
                  // Start a timer to update the current time
                  intervalRef.current = setInterval(() => {
                    if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
                      setCurrentTime(playerRef.current.getCurrentTime())
                      
                      // Update player state
                      const state = playerRef.current.getPlayerState()
                      setPlayerState(state === 1 ? 'playing' : 'paused')
                    }
                  }, 200)
                },
                onStateChange: (event) => {
                  setPlayerState(event.data === 1 ? 'playing' : 'paused')
                }
              }
            })
          }
        } else {
          // If YouTube API isn't available yet, wait for it
          window.onYouTubeIframeAPIReady = initializePlayer
        }
      } else if (selectedVideo.source === 'veo') {
        // Initialize Veo player
        const container = playerContainerRef.current
        if (!container) return

        // Clear the container
        container.innerHTML = ''
        
        // Create iframe for Veo player
        iframeElement = document.createElement('iframe')
        iframeElement.src = `https://app.veo.co/embed/matches/${selectedVideo.video_id}/?utm_source=embed&autoplay=0&controls=1`
        iframeElement.className = 'w-full h-full'
        iframeElement.frameBorder = '0'
        iframeElement.allowFullscreen = true
        container.appendChild(iframeElement)
        
        // Set up message listener for Veo player
        messageHandler = (event: MessageEvent) => {
          // Only handle messages from Veo
          if (event.origin !== 'https://app.veo.co') return
          
          try {
            const data = JSON.parse(event.data)
            
            // Handle different message types from Veo player
            switch (data.type) {
              case 'ready':
                setPlayerReady(true)
                break
              case 'timeupdate':
                setCurrentTime(data.currentTime)
                setPlayerState(data.isPlaying ? 'playing' : 'paused')
                break
            }
          } catch (e) {
            console.error('Error parsing Veo player message:', e)
          }
        }
        
        window.addEventListener('message', messageHandler)
        
        // Store player reference
        playerRef.current = {
          getCurrentTime: () => currentTime,
          seekTo: (seconds: number) => {
            iframeElement?.contentWindow?.postMessage(JSON.stringify({
              type: 'seek',
              time: seconds
            }), 'https://app.veo.co')
          },
          playVideo: () => {
            iframeElement?.contentWindow?.postMessage(JSON.stringify({
              type: 'play'
            }), 'https://app.veo.co')
          },
          pauseVideo: () => {
            iframeElement?.contentWindow?.postMessage(JSON.stringify({
              type: 'pause'
            }), 'https://app.veo.co')
          },
          getPlayerState: () => playerState === 'playing' ? 1 : 2
        } as VeoPlayer
        
        // Start interval to update current time
        intervalRef.current = setInterval(() => {
          if (playerRef.current) {
            setCurrentTime(playerRef.current.getCurrentTime())
          }
        }, 200)
      } else if (selectedVideo.source === 'facebook') {
        // Initialize Facebook player
        const container = playerContainerRef.current
        if (!container) return

        // Clear the container
        container.innerHTML = ''
        
        // Create iframe for Facebook player
        iframeElement = document.createElement('iframe')
        iframeElement.src = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(selectedVideo.url || '')}`
        iframeElement.className = 'w-full h-full'
        iframeElement.frameBorder = '0'
        iframeElement.allowFullscreen = true
        container.appendChild(iframeElement)
        
        // Set up message listener for Facebook player
        messageHandler = (event: MessageEvent) => {
          // Only handle messages from Facebook
          if (event.origin !== 'https://www.facebook.com') return
          
          try {
            const data = JSON.parse(event.data)
            
            // Handle different message types from Facebook player
            switch (data.type) {
              case 'ready':
                setPlayerReady(true)
                break
              case 'timeupdate':
                setCurrentTime(data.currentTime)
                setPlayerState(data.isPlaying ? 'playing' : 'paused')
                break
            }
          } catch (e) {
            console.error('Error parsing Facebook player message:', e)
          }
        }
        
        window.addEventListener('message', messageHandler)
        
        // Store player reference
        playerRef.current = {
          getCurrentTime: () => currentTime,
          seekTo: (seconds: number) => {
            iframeElement?.contentWindow?.postMessage(JSON.stringify({
              type: 'seek',
              time: seconds
            }), 'https://www.facebook.com')
          },
          playVideo: () => {
            iframeElement?.contentWindow?.postMessage(JSON.stringify({
              type: 'play'
            }), 'https://www.facebook.com')
          },
          pauseVideo: () => {
            iframeElement?.contentWindow?.postMessage(JSON.stringify({
              type: 'pause'
            }), 'https://www.facebook.com')
          },
          getPlayerState: () => playerState === 'playing' ? 1 : 2
        } as VeoPlayer
        
        // Start interval to update current time
        intervalRef.current = setInterval(() => {
          if (playerRef.current) {
            setCurrentTime(playerRef.current.getCurrentTime())
          }
        }, 200)
      }
    }

    initializePlayer()

    // Cleanup function
    return () => {
      if (messageHandler) {
        window.removeEventListener('message', messageHandler)
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [selectedVideo])
  
  // Fetch clips when a video is selected
  useEffect(() => {
    if (!selectedVideo) return;
    
    const fetchClipsForVideo = async () => {
      try {
        setLoadingClips(true);
        const { data, error } = await supabase
          .from('clips')
          .select('*')
          .eq('video_id', selectedVideo.video_id)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Error fetching clips for video:', error);
        } else {
          console.log(`Found ${data?.length || 0} existing clips for video`);
          
          // Map the clips to the format used in the app
          const mappedClips: ClipMarker[] = (data || []).map(clip => ({
            id: clip.id,
            startTime: clip.start_time,
            endTime: clip.end_time,
            title: clip.title,
            comment: '', // We'll fetch comments separately
            labels: [] // We'll populate this later if needed
          }));
          
          setClipMarkers(mappedClips);
          
          // Fetch comments for these clips if there are any
          if (mappedClips.length > 0) {
            fetchCommentsForClips(mappedClips.map(c => c.id));
          }
        }
      } catch (err) {
        console.error('Exception fetching clips for video:', err);
      } finally {
        setLoadingClips(false);
      }
    };

    // Counter fetching is now handled by the CountersSection
    // Timer fetching is now handled by the useTimers hook
    
    fetchClipsForVideo();
    // Timer fetching is now handled by the useTimers hook
  }, [selectedVideo]);
  
  // Function to fetch comments for clips
  const fetchCommentsForClips = async (clipIds: string[]) => {
    try {
      if (!clipIds.length) return;
      
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .in('clip_id', clipIds);
      
      if (error) {
        console.error('Error fetching comments for clips:', error);
        return;
      }
      
      // Update clipMarkers with comments
      setClipMarkers(currentClips => 
        currentClips.map(clip => {
          // Find regular comments for this clip
          const commentsForClip = data?.filter(c => 
            c.clip_id === clip.id && (!c.comment_type || c.comment_type !== 'labels')
          ) || [];
          
          // Find labels comment for this clip (if any)
          const labelsComment = data?.find(c => 
            c.clip_id === clip.id && c.comment_type === 'labels'
          );
          
          // Extract labels from the labels comment if it exists
          let labels: string[] = [];
          if (labelsComment && labelsComment.content.startsWith('LABELS:')) {
            const labelsText = labelsComment.content.substring('LABELS:'.length).trim();
            labels = labelsText.split(',').map((l: string) => l.trim()).filter((l: string) => l);
          }
          
          // Combine all regular comment content
          const commentText = commentsForClip.map(c => c.content).join('\n');
          
          return {
            ...clip,
            comment: commentText,
            labels: labels
          };
        })
      );
      
    } catch (err) {
      console.error('Exception fetching comments for clips:', err);
    }
  };
  
  const handleVideoSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const videoId = e.target.value
    if (!videoId) {
      setSelectedVideo(null)
      return
    }
    
    const video = videos.find(v => v.id === videoId)
    if (video) {
      setSelectedVideo(video)
      // Reset state when selecting a new video
      setIsRecording(false)
      setRecordingStart(null)
      // Don't clear clip markers here anymore, as we'll fetch them
    }
  }
  
  const handleStartRecording = () => {
    if (!playerRef.current) return
    
    const currentTime = playerRef.current.getCurrentTime()
    setRecordingStart(currentTime)
    setIsRecording(true)
  }
  
  const handleStopRecording = () => {
    if (!playerRef.current || recordingStart === null) return
    
    const endTime = playerRef.current.getCurrentTime()
    // Only proceed if we have a valid clip (at least 1 second long)
    if (endTime - recordingStart < 1) {
      setNotification({
        message: 'Clip is too short (minimum 1 second)',
        type: 'error'
      })
      setIsRecording(false)
      return
    }
    
    // Calculate and store duration
    const duration = endTime - recordingStart
    setClipDuration(duration)
    
    // Pause the video when ending the clip recording
    playerRef.current.pauseVideo()
    
    // Set up for the clip form
    setIsRecording(false)
    setShowClipForm(true)
  }
  
  // Counter management functions have been moved to useCounters hook
  
  // removeCounter has been moved to useCounters hook
  
  const addLabel = (label: string) => {
    if (!label.trim()) return
    
    if (!clipLabels.includes(label.trim())) {
      setClipLabels([...clipLabels, label.trim()])
    }
    
    setNewLabel('')
  }
  
  const removeLabel = (label: string) => {
    setClipLabels(clipLabels.filter(l => l !== label))
  }
  
  const handleSaveClip = async () => {
    if (!selectedVideo || recordingStart === null || !playerRef.current) return
    
    try {
      setIsSavingClip(true)
      
      const endTime = playerRef.current.getCurrentTime()
      
      // Get the current session to include the access token
      const { data: sessionData } = await supabase.auth.getSession()
      const session = sessionData.session
      
      if (!session) {
        throw new Error('No active session')
      }
      
      // Create the clip via API endpoint
      const clipPayload = {
        title: clipTitle.trim() || `Clip at ${formatTime(recordingStart)}`,
        video_id: selectedVideo.video_id,
        start_time: Math.floor(recordingStart),
        end_time: Math.floor(endTime),
        created_by: user.id,
        source: selectedVideo.source
      }
      const clipRes = await fetch('/api/clips/create', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(clipPayload)
      })
      const clipData = await clipRes.json()
      if (!clipRes.ok || !clipData || !clipData.id) {
        throw new Error(clipData?.message || 'Failed to create clip')
      }
      const clipId = clipData.id
      
      // Add labels to recent labels for future suggestions (avoiding duplicates)
      if (clipLabels.length > 0) {
        const updatedRecentLabels = [...clipLabels, ...recentLabels]
          .filter((label, index, self) => self.indexOf(label) === index)
          .slice(0, 20)
        setRecentLabels(updatedRecentLabels)
      }
      
      // Create the comment via API endpoint if provided
      if (clipComment.trim()) {
        const commentPayload = {
          clip_id: clipId,
          user_id: user.id,
          content: clipComment,
          role_visibility: 'both'
        }
        await fetch('/api/comments/create', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(commentPayload)
        })
      }
      
      // Save labels as a special comment if any exist
      if (clipLabels.length > 0) {
        const labelsString = `LABELS: ${clipLabels.join(', ')}`
        const labelsPayload = {
          clip_id: clipId,
          content: labelsString,
          created_by: user.id,
          role_visibility: 'both',
          comment_type: 'labels'
        }
        await fetch('/api/comments/create', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(labelsPayload)
        })
      }
      
      // Add to local state
      const newClip: ClipMarker = {
        id: clipId,
        startTime: recordingStart,
        endTime: Math.floor(endTime),
        title: clipTitle.trim() || `Clip at ${formatTime(recordingStart)}`,
        comment: clipComment,
        labels: [...clipLabels]
      }
      setClipMarkers([...clipMarkers, newClip])
      
      // Reset form
      setClipTitle('')
      setClipComment('')
      setClipLabels([])
      setShowClipForm(false)
      setRecordingStart(null)
      setClipDuration(0)
      
      setNotification({
        message: 'Clip saved successfully!',
        type: 'success'
      })
      setTimeout(() => setNotification(null), 3000)
      playerRef.current.playVideo()
    } catch (err) {
      console.error('Error saving clip:', err)
      setNotification({
        message: 'Error saving clip',
        type: 'error'
      })
    } finally {
      setIsSavingClip(false)
    }
  }
  
  const cancelClipCreation = () => {
    setShowClipForm(false)
    setRecordingStart(null)
    setClipTitle('')
    setClipComment('')
    setClipLabels([])
    
    // Resume video playback when canceling clip creation
    if (playerRef.current) {
      playerRef.current.playVideo()
    }
  }
  
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }
  
  const playClip = (clip: ClipMarker) => {
    if (!playerRef.current) return
    
    playerRef.current.seekTo(clip.startTime, true)
    playerRef.current.playVideo()
    
    // Optional: We could set up code to pause at the end time
    // by checking current time in the interval
  }

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isRecording && recordingStart !== null && playerRef.current) {
      timer = setInterval(() => {
        if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
          setRecordingElapsed(playerRef.current.getCurrentTime() - recordingStart)
        }
      }, 200)
    } else {
      setRecordingElapsed(0)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [isRecording, recordingStart])

  // Keyboard arrow key seeking for video player
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!playerRef.current || typeof playerRef.current.getCurrentTime !== 'function') return;
      const now = Date.now();
      if (now - lastSeekTimeRef.current < 200) return; // 200ms debounce
      let didSeek = false;
      const currentTime = playerRef.current.getCurrentTime();
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        playerRef.current.seekTo(Math.max(0, currentTime - 5), true);
        didSeek = true;
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        playerRef.current.seekTo(currentTime + 5, true);
        didSeek = true;
      }
      if (didSeek) lastSeekTimeRef.current = now;
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // All counter-related functions have been moved to the useCounters hook
  // All timer-related functions have been moved to the useTimers hook

    // All timer functions moved to useTimers hook

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Top Bar - removed header and user avatar */}
      <div className="h-4 bg-gray-900 border-b border-gray-800" />

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden w-full h-full">
        {/* Video Area */}
        <div className="flex-1 min-w-0 bg-black flex items-center justify-center relative h-full">
          {selectedVideo ? (
            <div className="h-full flex items-center justify-center w-full max-w-full overflow-hidden">
              {/* For YouTube and Veo, render the player with ref-based control */}
              {selectedVideo.source === 'youtube' && (
                <div ref={playerContainerRef} className="aspect-video bg-black w-full max-w-full" style={{ maxWidth: '100%' }}></div>
              )}
              {selectedVideo.source === 'veo' && selectedVideo.url && (
                <video
                  ref={el => {
                    if (el) {
                      playerRef.current = {
                        getCurrentTime: () => el.currentTime,
                        seekTo: (seconds: number) => { el.currentTime = seconds; },
                        playVideo: () => { el.play(); },
                        pauseVideo: () => { el.pause(); },
                        getPlayerState: () => el.paused ? 2 : 1
                      };
                    }
                  }}
                  src={selectedVideo.url}
                  controls
                  className="w-full h-full aspect-video"
                  style={{ background: 'black' }}
                  onTimeUpdate={e => setCurrentTime(e.currentTarget.currentTime)}
                  onLoadedMetadata={e => setCurrentTime(e.currentTarget.currentTime)}
                />
              )}
              {selectedVideo.source === 'facebook' && selectedVideo.url && (
                <iframe
                  className="w-full h-full aspect-video"
                  src={`https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(selectedVideo.url || '')}`}
                  frameBorder="0"
                  allowFullScreen
                  allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                  scrolling="no"
                ></iframe>
              )}
              {/* Fallback for unsupported sources */}
              {!['youtube', 'veo', 'facebook'].includes(selectedVideo.source) && (
                <div className="text-gray-400 text-lg">Unsupported video source</div>
              )}
            </div>
          ) : (
            <div className="text-gray-400 text-lg">Select a video to begin</div>
          )}
        </div>

        {/* Right Sidebar: Video selection, Clips or Counters */}
        {sidebarVisible && (
          <div className="w-[350px] bg-gray-900 text-white flex flex-col border-l border-gray-800 overflow-y-auto h-full">
            {/* Video selection dropdown at the top */}
            <div className="p-4 border-b border-gray-800">
              <label htmlFor="video-select" className="block mb-1 text-sm font-medium">Select a video</label>
              <select
                id="video-select"
                className="w-full border rounded px-3 py-1 text-sm bg-gray-800 border-gray-700 text-white"
                value={selectedVideo?.id || ''}
                onChange={handleVideoSelect}
              >
                <option value="">-- Select a video --</option>
                {videos.map(video => (
                  <option key={video.id} value={video.id}>{video.title}</option>
                ))}
              </select>
            </div>
            <div className="p-4 border-b border-gray-800 font-bold text-lg flex items-center">
              {sidebarTab === 'clips' ? 'Clips' : sidebarTab === 'counters' ? 'Counters' : sidebarTab === 'timers' ? 'Timers' : 'Create Clip'}
            </div>
            <div className="flex-1 overflow-y-auto">
              {sidebarTab === 'clips' ? (
                <Fragment>
                  {loadingClips && <div className="p-4 text-gray-400">Loading clips...</div>}
                  {!loadingClips && clipMarkers.length === 0 && (
                    <div className="p-4 text-gray-400">No clips created yet.</div>
                  )}
                  {[...clipMarkers]
                    .sort((a, b) => b.startTime - a.startTime)
                    .map((clip, index) => {
                      const isActive = currentTime >= clip.startTime && currentTime < clip.endTime;
                      return (
                        <div key={clip.id || index} className={`p-4 border-b border-gray-800 hover:bg-gray-800 cursor-pointer ${isActive ? 'bg-green-800 border-l-4 border-green-400' : ''}`}>
                          <div className="font-semibold">{clip.title}</div>
                          <div className="text-xs text-gray-400">{formatTime(clip.startTime)} - {formatTime(clip.endTime)} (Duration: {formatTime(clip.endTime - clip.startTime)})</div>
                          {clip.labels && clip.labels.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {clip.labels.map(label => (
                                <span key={label} className="px-2 py-0.5 text-xs rounded bg-blue-900 text-blue-100">{label}</span>
                              ))}
                            </div>
                          )}
                          {clip.comment && (
                            <div className="mt-2 p-2 rounded text-sm bg-gray-950 text-gray-200">{clip.comment}</div>
                          )}
                          <button
                            onClick={() => playClip(clip)}
                            className="mt-2 px-3 py-1 rounded text-xs bg-gray-700 hover:bg-gray-600"
                          >
                            Play
                          </button>
                        </div>
                      );
                    })}
                </Fragment>
              ) : sidebarTab === 'counters' ? (
                <Fragment>
                  <CountersSection
                    userId={user?.id}
                    videoId={selectedVideo?.id}
                    formatTime={formatTime}
                    onShowConfirmModal={(config) => {
                      setConfirmModalConfig(config);
                      setShowConfirmModal(true);
                    }}
                    onShowAddPlayerForm={(counterId, onConfirm) => {
                      setSelectedCounterId(counterId);
                      setSelectedTimerId(null);
                      setOnConfirmAddPlayerForModal(onConfirm);
                      setShowAddPlayerForm(true);
                    }}
                    currentTime={currentTime}
                    playerState={playerState}
                    onSeekTo={(time) => {
                      if (playerRef.current) {
                        playerRef.current.seekTo(time, true);
                        playerRef.current.playVideo();
                      }
                    }}
                  />
                </Fragment>
              ) : sidebarTab === 'timers' ? (
                <Fragment>
                  <TimersSection 
                    userId={user?.id}
                    videoId={selectedVideo?.id}
                    formatTime={formatTime}
                    onShowConfirmModal={(config) => {
                      setConfirmModalConfig(config);
                            setShowConfirmModal(true);
                          }}
                    onShowAddPlayerForm={(timerId) => {
                      setSelectedTimerId(timerId);
                      setSelectedCounterId(null);
                      // We don't set a callback here since timer player handling is done within TimersSection
                      setOnConfirmAddPlayerForModal(null);
                      setShowAddPlayerForm(true);
                    }}
                  />
                </Fragment>
              ) : (
                <Fragment>
                  {/* Show start/end buttons and status, only show form after ending the clip */}
                  {!isRecording && recordingStart === null && (
                    <div className="flex flex-col items-center justify-center p-6">
                      <button
                        onClick={handleStartRecording}
                        className={`px-6 py-3 rounded-full font-medium text-lg transition-colors ${isDarkMode ? 'bg-red-700 hover:bg-red-600 text-white' : 'bg-red-600 hover:bg-red-500 text-white'}`}
                      >
                        Start Clip
                      </button>
                    </div>
                  )}
                  {isRecording && (
                    <div className="flex flex-col items-center justify-center p-6">
                      <div className="flex items-center mb-4">
                        <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse mr-2"></div>
                        <span>Recording from {recordingStart !== null ? formatTime(recordingStart) : '0:00'}</span>
                        <span className="ml-4 text-sm font-mono text-blue-400">{formatTime(recordingElapsed)}</span>
                      </div>
                      <button
                        onClick={handleStopRecording}
                        className={`px-6 py-3 rounded-full font-medium text-lg transition-colors ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
                      >
                        End Clip
                      </button>
                    </div>
                  )}
                  {/* Only show the Save Clip form after recording has ended (recordingStart !== null && !isRecording) */}
                  {recordingStart !== null && !isRecording && (
                    <div className={`p-3 rounded border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-300'}`}>
                      <h3 className="text-lg font-medium mb-3">Save Clip</h3>
                      <div className="space-y-3">
                        <div>
                          <label htmlFor="clip-title" className="block mb-1 text-sm font-medium">
                            Clip Title (optional)
                          </label>
                          <input
                            id="clip-title"
                            type="text"
                            value={clipTitle}
                            onChange={(e) => setClipTitle(e.target.value)}
                            className={`w-full border rounded px-3 py-2 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                            placeholder="Enter a descriptive title (optional)"
                          />
                        </div>
                        {clipDuration > 0 && (
                          <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>Clip duration: {formatTime(clipDuration)}</div>
                        )}
                        <div>
                          <label htmlFor="clip-comment" className="block mb-1 text-sm font-medium">Coach's Comment</label>
                          <textarea
                            id="clip-comment"
                            value={clipComment}
                            onChange={(e) => setClipComment(e.target.value)}
                            className={`w-full border rounded px-3 py-2 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                            rows={3}
                            placeholder="Add your analysis of this clip"
                          ></textarea>
                        </div>
                        <div>
                          <label className="block mb-1 text-sm font-medium">Labels/Tags (optional)</label>
                          <div className="mb-2">
                            <input
                              type="text"
                              value={newLabel}
                              onChange={(e) => setNewLabel(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && addLabel(newLabel)}
                              className={`w-full border rounded px-3 py-2 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                              placeholder="Add labels (e.g., attack, defense, player name)"
                            />
                            <button
                              onClick={() => addLabel(newLabel)}
                              className={`mt-2 w-full px-3 py-2 rounded transition-colors ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
                            >Add</button>
                          </div>
                          {/* Recent tags as buttons */}
                          <div className="flex flex-wrap gap-2 mb-2">
                            {recentLabels.slice(0, 10).map(label => (
                              <button
                                key={label}
                                onClick={() => addLabel(label)}
                                className={`text-xs px-2 py-1 rounded transition-colors ${clipLabels.includes(label) ? isDarkMode ? 'bg-blue-800 text-white' : 'bg-blue-200 text-blue-800' : isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-800'} hover:opacity-80`}
                              >{label}</button>
                            ))}
                          </div>
                          {clipLabels.length > 0 && (
                            <div className="flex flex-wrap gap-2 mb-2">
                              {clipLabels.map(label => (
                                <div key={label} className={`flex items-center space-x-1 px-2 py-1 rounded text-sm ${isDarkMode ? 'bg-blue-900 text-blue-100' : 'bg-blue-100 text-blue-800'}`}>
                                  <span>{label}</span>
                                  <button onClick={() => removeLabel(label)} className="hover:text-red-500">×</button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex space-x-3">
                          <button
                            onClick={handleSaveClip}
                            disabled={isSavingClip}
                            className={`px-4 py-2 rounded font-medium transition-colors ${isDarkMode ? 'bg-blue-700 hover:bg-blue-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'} ${isSavingClip ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >{isSavingClip ? 'Saving...' : 'Save Clip'}</button>
                          <button
                            onClick={() => {
                              setSidebarTab('clips');
                              cancelClipCreation();
                            }}
                            disabled={isSavingClip}
                            className={`px-4 py-2 rounded font-medium transition-colors ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'} ${isSavingClip ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >Cancel</button>
                        </div>
                      </div>
                    </div>
                  )}
                </Fragment>
              )}
            </div>
          </div>
        )}

        {/* Far Right Sidebar for navigation */}
        <div className="flex flex-col w-16 bg-gray-950 border-l border-gray-800 items-center py-4 space-y-4">
          {/* Toggle sidebar visibility */}
          <button
            className={`w-10 h-10 flex items-center justify-center rounded-lg ${!sidebarVisible ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
            onClick={() => setSidebarVisible(!sidebarVisible)}
            title={sidebarVisible ? 'Hide Sidebar' : 'Show Sidebar'}
          >
            {sidebarVisible ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12h12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m-7.5-7.5l7.5 7.5-7.5 7.5" />
              </svg>
            )}
          </button>
          {/* Create Clip tab - now immediately after minimize */}
          <button
            className={`w-10 h-10 flex items-center justify-center rounded-lg ${sidebarTab === 'createClip' && sidebarVisible ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
            onClick={() => { setSidebarTab('createClip'); setLastSidebarTab('createClip'); }}
            title="Create Clip"
            disabled={!sidebarVisible}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
          <button
            className={`w-10 h-10 flex items-center justify-center rounded-lg ${sidebarTab === 'clips' && sidebarVisible ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
            onClick={() => { setSidebarTab('clips'); setLastSidebarTab('clips'); }}
            title="Show Clips"
            disabled={!sidebarVisible}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 15l3-3m0 0l-3-3m3 3H9" />
            </svg>
          </button>
          <button
            className={`w-10 h-10 flex items-center justify-center rounded-lg ${sidebarTab === 'counters' && sidebarVisible ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
            onClick={() => { setSidebarTab('counters'); setLastSidebarTab('counters'); }}
            title="Show Counters"
            disabled={!sidebarVisible}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </button>
          <button
            className={`w-10 h-10 flex items-center justify-center rounded-lg ${sidebarTab === 'timers' && sidebarVisible ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
            onClick={() => { setSidebarTab('timers'); setLastSidebarTab('timers'); }}
            title="Show Timers"
            disabled={!sidebarVisible}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
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

      {/* Add Player Form Modal */}
      {showAddPlayerForm && (selectedCounterId || selectedTimerId) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-4 rounded-lg w-80 border border-gray-700">
            <h3 className="text-lg font-medium mb-3 text-white">Add Player</h3>
            <input
              type="text"
              value={addPlayerName}
              onChange={e => setAddPlayerName(e.target.value)}
              onKeyPress={e => {
                if (e.key === 'Enter') {
                  if (selectedCounterId && onConfirmAddPlayerForModal && addPlayerName.trim()) {
                    onConfirmAddPlayerForModal(addPlayerName.trim());
                    setShowAddPlayerForm(false);
                    setAddPlayerName('');
                    setSelectedCounterId(null);
                    setOnConfirmAddPlayerForModal(null);
                  } else if (selectedTimerId) {
                    toast.info("Player addition for timers is managed by TimersSection");
                    setShowAddPlayerForm(false);
                    setAddPlayerName('');
                    setSelectedTimerId(null);
                  } else if (!addPlayerName.trim()) {
                    toast.warn("Player name cannot be empty");
                  }
                }
              }}
              placeholder="Player name"
              className="w-full mb-4 px-3 py-2 rounded bg-gray-700 border border-gray-600 text-white"
              autoFocus
            />
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  if (selectedCounterId && onConfirmAddPlayerForModal && addPlayerName.trim()) {
                    onConfirmAddPlayerForModal(addPlayerName.trim());
                    setShowAddPlayerForm(false);
                    setAddPlayerName('');
                    setSelectedCounterId(null);
                    setOnConfirmAddPlayerForModal(null);
                  } else if (selectedTimerId) {
                    toast.info("Player addition for timers is managed by TimersSection");
                    setShowAddPlayerForm(false);
                    setAddPlayerName('');
                    setSelectedTimerId(null);
                  } else if (!addPlayerName.trim()) {
                    toast.warn("Player name cannot be empty");
                  }
                }}
                className="flex-1 px-3 py-2 rounded bg-green-700 hover:bg-green-600 text-white"
                disabled={!addPlayerName.trim()}
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowAddPlayerForm(false);
                  setAddPlayerName('');
                  setSelectedCounterId(null);
                  setSelectedTimerId(null);
                  setOnConfirmAddPlayerForModal(null);
                }}
                className="flex-1 px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && confirmModalConfig && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-96 border border-gray-700">
            <h3 className="text-xl font-medium mb-3 text-white">{confirmModalConfig.title}</h3>
            <p className="text-gray-300 mb-6">{confirmModalConfig.message}</p>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  confirmModalConfig.onConfirm();
                  setShowConfirmModal(false);
                  setConfirmModalConfig(null);
                }}
                className="flex-1 px-4 py-2 rounded bg-red-700 hover:bg-red-600 text-white"
              >
                Confirm
              </button>
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmModalConfig(null);
                }}
                className="flex-1 px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white"
              >
                Cancel
              </button>
            </div>
          </div>
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