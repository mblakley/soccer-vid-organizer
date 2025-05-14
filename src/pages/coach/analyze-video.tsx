'use client'
import { useState, useEffect, useRef, Fragment } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { withAuth } from '@/components/auth'
import { useTheme } from '@/contexts/ThemeContext'
import { useRouter } from 'next/router'
import { toast } from 'react-toastify'
import ClipPlayer from '@/components/ClipPlayer'

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

type CounterType = 'standard' | 'resettable' | 'player-based';
interface CountTracker {
  id: string;
  name: string;
  count: number;
  timestamps: number[];
  type: CounterType;
  players?: string[]; // Array of player names for player-based counters
  playerCounts?: Record<string, { count: number, timestamps: number[] }>; // Tracking counts per player
}

// Types for player timers
interface TimerSession {
  startTime: number;
  endTime: number | null;
  duration: number;
}

interface PlayerTimer {
  id: string;
  name: string;
  startTime: number | null;
  endTime: number | null;
  duration: number;
  active: boolean;
  type?: 'standard' | 'player-based';
  players?: string[];
  playerTimes?: Record<string, {
    duration: number;
    active: boolean;
    startTime: number | null;
    sessions: TimerSession[];
  }>;
  sessions: TimerSession[];
}

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
  
  // For count tracking
  const [counters, setCounters] = useState<CountTracker[]>([])
  const [showCounterForm, setShowCounterForm] = useState(false)
  const [newCounterName, setNewCounterName] = useState('')
  const [newCounterType, setNewCounterType] = useState<CounterType>('standard')
  const [newCounterPlayers, setNewCounterPlayers] = useState<string[]>([])
  const [newPlayerName, setNewPlayerName] = useState('')
  const [showAddPlayerForm, setShowAddPlayerForm] = useState(false)
  const [selectedCounterId, setSelectedCounterId] = useState<string | null>(null)
  const [selectedTimerId, setSelectedTimerId] = useState<string | null>(null)
  const [addPlayerName, setAddPlayerName] = useState('')
  
  // YouTube player reference
  const playerRef = useRef<any>(null)
  const playerContainerRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Track if we should show the fixed buttons
  const shouldShowFixedButtons = selectedVideo && playerReady && !isRecording && !showClipForm
  const shouldShowCounterForm = showCounterForm && selectedVideo

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

  // For player timers
  const [playerTimers, setPlayerTimers] = useState<PlayerTimer[]>([])
  const [newTimerName, setNewTimerName] = useState('')
  const [showTimerForm, setShowTimerForm] = useState(false)
  const [newTimerType, setNewTimerType] = useState<'standard' | 'player-based'>('standard')
  const [newTimerPlayers, setNewTimerPlayers] = useState<string[]>([])
  const [newTimerPlayerName, setNewTimerPlayerName] = useState('')
  const [selectedPlayerForSessions, setSelectedPlayerForSessions] = useState<{timerId: string, playerName: string} | null>(null)

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
    if (selectedVideo.source !== 'youtube' && selectedVideo.source !== 'veo') {
      setNotification({
        message: 'Only YouTube and Veo videos are currently supported for analysis',
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

    const fetchCountersForVideo = async () => {
      try {
        // Fetch all counters
        const { data: countersData, error: countersError } = await supabase
          .from('counters')
          .select('*')
          .order('created_at', { ascending: false });

        if (countersError) throw countersError;

        // For each counter, fetch its events
        const countersWithEvents = await Promise.all(
          (countersData || []).map(async (counter) => {
            const { data: events, error: eventsError } = await supabase
              .from('counter_events')
              .select('timestamp')
              .eq('counter_id', counter.id)
              .order('timestamp', { ascending: true });

            if (eventsError) throw eventsError;

            const mappedCounter: CountTracker = {
              id: counter.id,
              name: counter.name,
              count: counter.count,
              timestamps: events.map(e => e.timestamp),
              type: counter.type,
            };

            // If it's a player-based counter, initialize player data
            if (counter.type === 'player-based') {
              mappedCounter.players = [];
              mappedCounter.playerCounts = {};
            }

            return mappedCounter;
          })
        );

        setCounters(countersWithEvents);
      } catch (error) {
        console.error('Error fetching counters:', error);
        toast.error('Failed to load counters');
      }
    };

    const fetchTimersForVideo = async () => {
      try {
        // Fetch all timers
        const { data: timersData, error: timersError } = await supabase
          .from('timers')
          .select('*')
          .order('created_at', { ascending: false });

        if (timersError) throw timersError;

        // For each timer, fetch its events
        const timersWithEvents = await Promise.all(
          (timersData || []).map(async (timer) => {
            const { data: events, error: eventsError } = await supabase
              .from('timer_events')
              .select('*')
              .eq('timer_id', timer.id)
              .order('start_time', { ascending: true });

            if (eventsError) throw eventsError;

            const mappedTimer: PlayerTimer = {
              id: timer.id,
              name: timer.name,
              startTime: null,
              endTime: null,
              duration: timer.duration || 0,
              active: false,
              type: timer.type,
              sessions: events.map(e => ({
                startTime: e.start_time,
                endTime: e.end_time,
                duration: e.duration || 0
              }))
            };

            // If it's a player-based timer, initialize player data
            if (timer.type === 'player-based') {
              mappedTimer.players = [];
              mappedTimer.playerTimes = {};
            }

            return mappedTimer;
          })
        );

        setPlayerTimers(timersWithEvents);
      } catch (error) {
        console.error('Error fetching timers:', error);
        toast.error('Failed to load timers');
      }
    };
    
    fetchClipsForVideo();
    fetchCountersForVideo();
    fetchTimersForVideo();
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
  
  const handleAddCounter = () => {
    setShowCounterForm(true)
  }
  
  const saveCounter = async () => {
    if (!newCounterName.trim()) {
      setNotification({
        message: 'Please enter a name for the counter',
        type: 'error'
      })
      return
    }
    
    // For player-based counters, validate that we have players
    if (newCounterType === 'player-based' && newCounterPlayers.length === 0) {
      setNotification({
        message: 'Please add at least one player for a player-based counter',
        type: 'error'
      })
      return
    }

    try {
      // Create counter in database
      const { data: counterData, error: counterError } = await supabase
        .from('counters')
        .insert({
          name: newCounterName,
          type: newCounterType,
          count: 0
        })
        .select()
        .single()

      if (counterError) throw counterError

      const newCounter: CountTracker = {
        id: counterData.id,
        name: newCounterName,
        count: 0,
        timestamps: [],
        type: newCounterType,
      }
      
      // Add player-specific data if it's a player-based counter
      if (newCounterType === 'player-based') {
        newCounter.players = [...newCounterPlayers]
        newCounter.playerCounts = {}
        
        // Initialize counts for each player
        newCounterPlayers.forEach(player => {
          newCounter.playerCounts![player] = {
            count: 0,
            timestamps: []
          }
        })
      }
      
      setCounters([...counters, newCounter])
      setNewCounterName('')
      setNewCounterType('standard')
      setNewCounterPlayers([])
      setNewPlayerName('')
      setShowCounterForm(false)
      setNotification({
        message: `Counter "${newCounterName}" added!`,
        type: 'success'
      })
      setTimeout(() => setNotification(null), 3000)
    } catch (error) {
      console.error('Error creating counter:', error)
      toast.error('Failed to create counter')
    }
  }
  
  const incrementCounter = async (counterId: string, playerName?: string) => {
    if (!playerRef.current) return
    const currentTime = playerRef.current.getCurrentTime()

    try {
      // Create counter event
      const { error: eventError } = await supabase
        .from('counter_events')
        .insert({
          counter_id: counterId,
          timestamp: currentTime,
          value: 1,
          team_member_id: null // We'll add player tracking later
        })

      if (eventError) throw eventError

      // Get the new count using RPC
      const { data: newCount, error: rpcError } = await supabase
        .rpc('increment_counter', { counter_id: counterId })

      if (rpcError) throw rpcError

      // Get all events for this counter to update timestamps
      const { data: events, error: eventsError } = await supabase
        .from('counter_events')
        .select('timestamp')
        .eq('counter_id', counterId)
        .order('timestamp', { ascending: true })

      if (eventsError) throw eventsError

      // Update local state
      setCounters(prevCounters =>
        prevCounters.map(counter => {
          if (counter.id !== counterId) return counter;
          
          // Handle player-based counters differently
          if (counter.type === 'player-based' && playerName && counter.playerCounts) {
            // Prevent double-counting if video is paused and last timestamp is the same (within 0.5s)
            const playerData = counter.playerCounts[playerName];
            const lastTimestamp = playerData?.timestamps[playerData.timestamps.length - 1];
            
            if (
              playerState === 'paused' &&
              lastTimestamp !== undefined &&
              Math.abs(lastTimestamp - currentTime) < 0.5
            ) {
              return counter;
            }
            
            // Create a deep copy to avoid mutating state directly
            const updatedPlayerCounts = { ...counter.playerCounts };
            updatedPlayerCounts[playerName] = {
              count: (updatedPlayerCounts[playerName]?.count || 0) + 1,
              timestamps: [...(updatedPlayerCounts[playerName]?.timestamps || []), currentTime]
            };
            
            // Update the total count as well
            return {
              ...counter,
              count: newCount,
              timestamps: events.map(e => e.timestamp),
              playerCounts: updatedPlayerCounts
            };
          }
          
          // Handle standard and resettable counters as before
          // Prevent double-counting if video is paused and last timestamp is the same (within 0.5s)
          const lastTimestamp = counter.timestamps[counter.timestamps.length - 1];
          if (
            playerState === 'paused' &&
            lastTimestamp !== undefined &&
            Math.abs(lastTimestamp - currentTime) < 0.5
          ) {
            return counter;
          }
          return {
            ...counter,
            count: newCount,
            timestamps: events.map(e => e.timestamp)
          };
        })
      )
    } catch (error) {
      console.error('Error incrementing counter:', error)
      toast.error('Failed to increment counter')
    }
  }
  
  const removeCounter = async (counterId: string) => {
    try {
      // First delete all counter events
      const { error: eventsError } = await supabase
        .from('counter_events')
        .delete()
        .eq('counter_id', counterId)

      if (eventsError) throw eventsError

      // Then delete the counter
      const { error: counterError } = await supabase
        .from('counters')
        .delete()
        .eq('id', counterId)

      if (counterError) throw counterError

      // Update local state
      setCounters(prevCounters => 
        prevCounters.filter(counter => counter.id !== counterId)
      )
    } catch (error) {
      console.error('Error removing counter:', error)
      toast.error('Failed to remove counter')
    }
  }
  
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

  const resetCounter = (counterId: string) => {
    if (!playerRef.current) return;
    const currentTime = playerRef.current.getCurrentTime();
    setCounters(prevCounters =>
      prevCounters.map(counter =>
        counter.id === counterId
          ? { ...counter, count: 1, timestamps: [currentTime] }
          : counter
      )
    );
  };

  const addPlayer = (player: string) => {
    if (!player.trim()) return;
    
    if (!newCounterPlayers.includes(player.trim())) {
      setNewCounterPlayers([...newCounterPlayers, player.trim()]);
    }
    
    setNewPlayerName('');
  }
  
  const removePlayer = (player: string) => {
    setNewCounterPlayers(newCounterPlayers.filter(p => p !== player));
  }

  // Timer functions
  const handleAddTimer = () => {
    setShowTimerForm(true)
  }
  
  const saveTimer = async () => {
    if (!newTimerName.trim()) {
      setNotification({
        message: 'Please enter a name for the timer',
        type: 'error'
      })
      return
    }
    
    // For player-based timers, validate that we have players
    if (newTimerType === 'player-based' && newTimerPlayers.length === 0) {
      setNotification({
        message: 'Please add at least one player for a player-based timer',
        type: 'error'
      })
      return
    }
    
    try {
      // Create timer in database
      const { data: timerData, error: timerError } = await supabase
        .from('timers')
        .insert({
          name: newTimerName,
          type: newTimerType,
          video_id: selectedVideo?.id // Use the database video ID instead of YouTube video ID
        })
        .select()
        .single()

      if (timerError) throw timerError

      const newTimer: PlayerTimer = {
        id: timerData.id,
        name: newTimerName,
        startTime: null,
        endTime: null,
        duration: 0,
        active: false,
        type: newTimerType,
        sessions: []
      }
      
      // Add player-specific data if it's a player-based timer
      if (newTimerType === 'player-based') {
        newTimer.players = [...newTimerPlayers]
        newTimer.playerTimes = {}
        
        // Initialize times for each player
        newTimerPlayers.forEach(player => {
          newTimer.playerTimes![player] = {
            duration: 0,
            active: false,
            startTime: null,
            sessions: []
          }
        })
      }
      
      setPlayerTimers([...playerTimers, newTimer])
      setNewTimerName('')
      setNewTimerType('standard')
      setNewTimerPlayers([])
      setNewTimerPlayerName('')
      setShowTimerForm(false)
      setNotification({
        message: `Timer "${newTimerName}" added!`,
        type: 'success'
      })
      setTimeout(() => setNotification(null), 3000)
    } catch (error) {
      console.error('Error creating timer:', error)
      toast.error('Failed to create timer')
    }
  }
  
  // Add player to timer form
  const addPlayerToTimerForm = (player: string) => {
    if (!player.trim()) return;
    
    if (!newTimerPlayers.includes(player.trim())) {
      setNewTimerPlayers([...newTimerPlayers, player.trim()]);
    }
    
    setNewTimerPlayerName('');
  }
  
  // Remove player from timer form
  const removePlayerFromTimerForm = (player: string) => {
    setNewTimerPlayers(newTimerPlayers.filter(p => p !== player));
  }
  
  // Toggle individual player timer
  const togglePlayerTimer = (timerId: string, playerName: string) => {
    if (!playerRef.current) return;
    const currentTime = playerRef.current.getCurrentTime();
    
    setPlayerTimers(prevTimers =>
      prevTimers.map(timer => {
        if (timer.id !== timerId || !timer.playerTimes || !timer.players?.includes(playerName)) 
          return timer;
        
        const playerTime = timer.playerTimes[playerName];
        
        if (playerTime.active) {
          // Stop the timer for this player
          const sessionDuration = playerTime.startTime !== null
            ? currentTime - playerTime.startTime
            : 0;
            
          // Update the most recent session
          const updatedSessions = [...playerTime.sessions];
          if (updatedSessions.length > 0) {
            const lastSession = updatedSessions[updatedSessions.length - 1];
            updatedSessions[updatedSessions.length - 1] = {
              ...lastSession,
              endTime: currentTime,
              duration: sessionDuration
            };
          }
          
          return {
            ...timer,
            playerTimes: {
              ...timer.playerTimes,
              [playerName]: {
                ...playerTime,
                duration: playerTime.duration + sessionDuration,
                active: false,
                startTime: null,
                sessions: updatedSessions
              }
            }
          };
        } else {
          // Start the timer for this player
          const newSession: TimerSession = {
            startTime: currentTime,
            endTime: null,
            duration: 0
          };
          
          return {
            ...timer,
            playerTimes: {
              ...timer.playerTimes,
              [playerName]: {
                ...playerTime,
                active: true,
                startTime: currentTime,
                sessions: [...playerTime.sessions, newSession]
              }
            }
          };
        }
      })
    );
  };

  // Add player to existing player-based timer
  const addPlayerToTimer = (timerId: string, playerName: string) => {
    if (!playerName.trim()) return;
    
    setPlayerTimers(prevTimers =>
      prevTimers.map(timer => {
        if (timer.id !== timerId || timer.type !== 'player-based') return timer;
        
        // Check if player already exists
        if (timer.players?.includes(playerName.trim())) {
          return timer;
        }
        
        // Add player to the timer
        const updatedPlayers = [...(timer.players || []), playerName.trim()];
        const updatedPlayerTimes = { ...(timer.playerTimes || {}) };
        
        // Initialize time for the new player
        updatedPlayerTimes[playerName.trim()] = {
          duration: 0,
          active: false,
          startTime: null,
          sessions: []
        };
        
        return {
          ...timer,
          players: updatedPlayers,
          playerTimes: updatedPlayerTimes
        };
      })
    );
  };

  // Real-time tracking for active timers
  useEffect(() => {
    let timerInterval: NodeJS.Timeout | null = null;
    
    // Only start the interval if there are active timers and player is ready
    const hasActiveTimers = playerTimers.some(timer => timer.active);
    
    if (hasActiveTimers && playerRef.current) {
      timerInterval = setInterval(() => {
        // Force the component to re-render to update the active timer display
        setCurrentTime(prev => prev + 0.2);  // Just trigger a re-render every 200ms
      }, 200);
    }
    
    return () => {
      if (timerInterval) {
        clearInterval(timerInterval);
      }
    };
  }, [playerTimers]);

  const addPlayerToCounter = (counterId: string, playerName: string) => {
    if (!playerName.trim()) return;
    
    setCounters(prevCounters =>
      prevCounters.map(counter => {
        if (counter.id !== counterId || counter.type !== 'player-based') return counter;
        
        // Check if player already exists
        if (counter.players?.includes(playerName.trim())) {
          return counter;
        }
        
        // Add player to the counter
        const updatedPlayers = [...(counter.players || []), playerName.trim()];
        const updatedPlayerCounts = { ...(counter.playerCounts || {}) };
        
        // Initialize count for the new player
        updatedPlayerCounts[playerName.trim()] = {
          count: 0,
          timestamps: []
        };
        
        return {
          ...counter,
          players: updatedPlayers,
          playerCounts: updatedPlayerCounts
        };
      })
    );
  };

  const startTimer = async (timerId: string) => {
    if (!playerRef.current) return
    const currentTime = playerRef.current.getCurrentTime()
    
    try {
      // Create timer event
      const { data: eventData, error: eventError } = await supabase
        .from('timer_events')
        .insert({
          timer_id: timerId,
          start_time: currentTime,
          end_time: null,
          duration: null,
          team_member_id: null // We'll add player tracking later
        })
        .select()
        .single()

      if (eventError) throw eventError

      // Update local state
      setPlayerTimers(prevTimers =>
        prevTimers.map(timer => {
          if (timer.id !== timerId) return timer
          
          // Create a new session when starting the timer
          const newSession: TimerSession = {
            startTime: currentTime,
            endTime: null,
            duration: 0
          }
          
          return {
            ...timer,
            startTime: currentTime,
            active: true,
            sessions: [...timer.sessions, newSession]
          }
        })
      )
    } catch (error) {
      console.error('Error starting timer:', error)
      toast.error('Failed to start timer')
    }
  }
  
  const stopTimer = async (timerId: string) => {
    if (!playerRef.current) return
    const currentTime = playerRef.current.getCurrentTime()
    
    try {
      // Get the most recent timer event for this timer
      const { data: events, error: eventsError } = await supabase
        .from('timer_events')
        .select('*')
        .eq('timer_id', timerId)
        .is('end_time', null)
        .order('start_time', { ascending: false })
        .limit(1)
        .single()

      if (eventsError) throw eventsError

      if (events) {
        // Update the timer event
        const { error: updateError } = await supabase
          .from('timer_events')
          .update({
            end_time: currentTime,
            duration: currentTime - events.start_time
          })
          .eq('id', events.id)

        if (updateError) throw updateError
      }

      // Update local state
      setPlayerTimers(prevTimers =>
        prevTimers.map(timer => {
          if (timer.id !== timerId) return timer
          
          // Calculate duration only if timer was active and had a start time
          if (timer.active && timer.startTime !== null) {
            const sessionDuration = currentTime - timer.startTime
            
            // Update the most recent session
            const updatedSessions = [...timer.sessions]
            if (updatedSessions.length > 0) {
              const lastSession = updatedSessions[updatedSessions.length - 1]
              updatedSessions[updatedSessions.length - 1] = {
                ...lastSession,
                endTime: currentTime,
                duration: sessionDuration
              }
            }
            
            return {
              ...timer,
              duration: timer.duration + sessionDuration,
              active: false,
              startTime: null,
              sessions: updatedSessions
            }
          }
          
          return timer
        })
      )
    } catch (error) {
      console.error('Error stopping timer:', error)
      toast.error('Failed to stop timer')
    }
  }
  
  const removeTimer = async (timerId: string) => {
    try {
      // First delete all timer events
      const { error: eventsError } = await supabase
        .from('timer_events')
        .delete()
        .eq('timer_id', timerId)

      if (eventsError) throw eventsError

      // Then delete the timer
      const { error: timerError } = await supabase
        .from('timers')
        .delete()
        .eq('id', timerId)

      if (timerError) throw timerError

      // Update local state
      setPlayerTimers(prevTimers => 
        prevTimers.filter(timer => timer.id !== timerId)
      )
    } catch (error) {
      console.error('Error removing timer:', error)
      toast.error('Failed to remove timer')
    }
  }
  
  const resetTimer = (timerId: string) => {
    setPlayerTimers(prevTimers =>
      prevTimers.map(timer => {
        if (timer.id !== timerId) return timer
        return {
          ...timer,
          startTime: null,
          endTime: null,
          duration: 0,
          active: false
        }
      })
    )
  }

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
              {/* Fallback for unsupported sources */}
              {!['youtube', 'veo'].includes(selectedVideo.source) && (
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
                  {counters.length === 0 && (
                    <div className="p-4 text-gray-400">No counters yet. Add one below.</div>
                  )}
                  {counters.map(counter => (
                    <div
                      key={counter.id}
                      className="relative p-4 border-b border-gray-800 hover:bg-gray-800 cursor-pointer group flex flex-col justify-between min-h-[120px]"
                      onClick={counter.type !== 'player-based' ? () => incrementCounter(counter.id) : undefined}
                    >
                      {/* Name and Remove X in a row at the top */}
                      <div className="flex items-center justify-between w-full mb-2">
                        <span className="font-semibold text-center w-full pr-6">{counter.name}</span>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            setConfirmModalConfig({
                              title: 'Remove Counter',
                              message: `Are you sure you want to remove the counter "${counter.name}"? This action cannot be undone.`,
                              onConfirm: () => removeCounter(counter.id)
                            });
                            setShowConfirmModal(true);
                          }}
                          className="ml-2 w-6 h-6 flex items-center justify-center rounded-full text-xs bg-red-700 hover:bg-red-800 text-white opacity-80 group-hover:opacity-100 transition-opacity"
                          title="Remove counter"
                        >
                          ×
                        </button>
                      </div>
                      
                      {/* Show appropriate content based on counter type */}
                      {counter.type === 'player-based' ? (
                        <div className="flex-1 flex flex-col items-center justify-center w-full">
                          <div className="text-2xl font-bold mb-2">Total: {counter.count}</div>
                          <div className="w-full grid grid-cols-3 gap-2">
                            {counter.players?.map(player => (
                              <button
                                key={player}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  incrementCounter(counter.id, player);
                                }}
                                className="px-1 py-1 bg-blue-800 hover:bg-blue-700 rounded text-center"
                              >
                                <div className="text-xs truncate">{player}</div>
                                <div className="text-lg font-bold">{counter.playerCounts?.[player]?.count || 0}</div>
                              </button>
                            ))}
                          </div>
                          
                          {/* Add Player button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCounterId(counter.id);
                              setAddPlayerName('');
                              setShowAddPlayerForm(true);
                            }}
                            className="mt-3 px-2 py-1 bg-green-700 hover:bg-green-600 rounded text-center flex items-center justify-center text-sm"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            Add Player
                          </button>
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center justify-center">
                          <span className="text-6xl font-extrabold text-center select-none pointer-events-none">{counter.count}</span>
                        </div>
                      )}
                      
                      {/* Reset button for resettable counters */}
                      {counter.type === 'resettable' && (
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            resetCounter(counter.id);
                          }}
                          className="mt-2 px-3 py-1 rounded bg-yellow-700 hover:bg-yellow-600 text-white text-xs w-full"
                        >
                          Reset
                        </button>
                      )}
                      
                      {/* Timestamps */}
                      {counter.type !== 'player-based' && counter.timestamps.length > 0 && (
                        <div className="mt-2 text-xs text-gray-400 w-full text-center">
                          {counter.timestamps.map((time, i) => (
                            <button
                              key={i}
                              onClick={e => {
                                e.stopPropagation();
                                if (playerRef.current) {
                                  playerRef.current.seekTo(time, true)
                                  playerRef.current.playVideo()
                                }
                              }}
                              className="mr-1 px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700"
                            >
                              {formatTime(time)}
                            </button>
                          ))}
                        </div>
                      )}
                      
                      {/* Player timestamps for player-based counters */}
                      {counter.type === 'player-based' && counter.players && (
                        <div className="mt-2">
                          <select
                            className="w-full px-3 py-1 rounded bg-gray-800 border border-gray-700 text-white text-xs"
                            onChange={(e) => {
                              const player = e.target.value;
                              if (player && counter.playerCounts?.[player]?.timestamps.length) {
                                const time = counter.playerCounts[player].timestamps[0];
                                if (playerRef.current) {
                                  playerRef.current.seekTo(time, true);
                                  playerRef.current.playVideo();
                                }
                              }
                            }}
                          >
                            <option value="">View player timestamps...</option>
                            {counter.players.map(player => 
                              counter.playerCounts?.[player]?.timestamps.length ? (
                                <option key={player} value={player}>
                                  {player} ({counter.playerCounts[player].timestamps.length} timestamps)
                                </option>
                              ) : null
                            )}
                          </select>
                        </div>
                      )}
                    </div>
                  ))}
                  {/* Add Counter Form */}
                  {showCounterForm ? (
                    <div className="p-4 border-t border-gray-800">
                      <input
                        type="text"
                        value={newCounterName}
                        onChange={e => setNewCounterName(e.target.value)}
                        placeholder="Counter name"
                        className="w-full mb-2 px-3 py-2 rounded bg-gray-800 border border-gray-700 text-white"
                      />
                      <select
                        value={newCounterType}
                        onChange={e => setNewCounterType(e.target.value as CounterType)}
                        className="w-full mb-2 px-3 py-2 rounded bg-gray-800 border border-gray-700 text-white"
                      >
                        <option value="standard">Standard (accumulates)</option>
                        <option value="resettable">Resettable (for streaks)</option>
                        <option value="player-based">Player-based (per player)</option>
                      </select>
                      
                      {/* Player input fields (only shown for player-based counters) */}
                      {newCounterType === 'player-based' && (
                        <div className="mb-3 border border-gray-700 rounded p-2">
                          <label className="text-sm text-gray-400 mb-1 block">Add Players:</label>
                          <div className="flex mb-2">
                            <input
                              type="text"
                              value={newPlayerName}
                              onChange={e => setNewPlayerName(e.target.value)}
                              onKeyPress={e => e.key === 'Enter' && addPlayer(newPlayerName)}
                              placeholder="Player name"
                              className="flex-1 px-3 py-2 rounded-l bg-gray-800 border border-gray-700 text-white"
                            />
                            <button
                              onClick={() => addPlayer(newPlayerName)}
                              className="px-3 py-2 rounded-r bg-blue-700 hover:bg-blue-600 text-white"
                            >
                              Add
                            </button>
                          </div>
                          {newCounterPlayers.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {newCounterPlayers.map(player => (
                                <div key={player} className="flex items-center space-x-1 px-2 py-1 rounded text-sm bg-blue-900 text-blue-100">
                                  <span>{player}</span>
                                  <button onClick={() => removePlayer(player)} className="hover:text-red-500">×</button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={saveCounter}
                          className="flex-1 px-3 py-2 rounded bg-green-700 hover:bg-green-600 text-white"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setShowCounterForm(false)}
                          className="flex-1 px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 border-t border-gray-800">
                      <button
                        onClick={handleAddCounter}
                        className="w-full px-3 py-2 rounded bg-blue-700 hover:bg-blue-600 text-white"
                      >
                        Add Counter
                      </button>
                    </div>
                  )}
                </Fragment>
              ) : sidebarTab === 'timers' ? (
                <Fragment>
                  {playerTimers.length === 0 && (
                    <div className="p-4 text-gray-400">No timers yet. Add one below.</div>
                  )}
                  {playerTimers.map(timer => (
                    <div
                      key={timer.id}
                      className="relative p-4 border-b border-gray-800 hover:bg-gray-800 flex flex-col justify-between min-h-[120px]"
                    >
                      {/* Name and Remove X in a row at the top */}
                      <div className="flex items-center justify-between w-full mb-2">
                        <span className="font-semibold text-center w-full pr-6">{timer.name}</span>
                        <button
                          onClick={() => {
                            setConfirmModalConfig({
                              title: 'Remove Timer',
                              message: `Are you sure you want to remove the timer "${timer.name}"? This action cannot be undone.`,
                              onConfirm: () => removeTimer(timer.id)
                            });
                            setShowConfirmModal(true);
                          }}
                          className="ml-2 w-6 h-6 flex items-center justify-center rounded-full text-xs bg-red-700 hover:bg-red-800 text-white opacity-80 hover:opacity-100 transition-opacity"
                          title="Remove timer"
                        >
                          ×
                        </button>
                      </div>
                      
                      {/* Different content based on timer type */}
                      {timer.type === 'player-based' ? (
                        <div className="flex-1 flex flex-col justify-center w-full">
                          <div className="w-full grid grid-cols-3 gap-2 mt-2">
                            {timer.players?.map(player => {
                              const playerTime = timer.playerTimes?.[player];
                              const isActive = playerTime?.active || false;
                              const duration = playerTime?.duration || 0;
                              const currentSessionTime = isActive && playerTime?.startTime && playerRef.current
                                ? playerRef.current.getCurrentTime() - playerTime.startTime 
                                : 0;
                              const totalTime = isActive ? duration + currentSessionTime : duration;
                              
                              return (
                                <button
                                  key={player}
                                  onClick={() => togglePlayerTimer(timer.id, player)}
                                  className={`px-1 py-1 ${isActive ? 'bg-green-800 hover:bg-green-700' : 'bg-blue-800 hover:bg-blue-700'} rounded text-center`}
                                >
                                  <div className="text-xs truncate flex items-center justify-center">
                                    {player}
                                    {isActive && (
                                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse ml-1"></div>
                                    )}
                                  </div>
                                  <div className="text-lg font-bold">
                                    {formatTime(totalTime)}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                          
                          {/* Add Player button */}
                          <div className="mt-3 flex justify-center">
                            <button
                              onClick={(e) => {
                                setSelectedTimerId(timer.id);
                                setSelectedCounterId(null);
                                setAddPlayerName('');
                                setShowAddPlayerForm(true);
                              }}
                              className="px-2 py-1 bg-green-700 hover:bg-green-600 rounded text-center flex items-center justify-center text-sm"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 mr-1">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                              </svg>
                              Add Player
                            </button>
                          </div>

                          {/* Sessions view */}
                          {timer.players && timer.players.length > 0 && (
                            <div className="mt-3">
                              <select 
                                className="w-full px-3 py-1 rounded bg-gray-800 border border-gray-700 text-white text-xs"
                                onChange={(e) => {
                                  const selectedPlayer = e.target.value;
                                  if (!selectedPlayer) {
                                    setSelectedPlayerForSessions(null);
                                    return;
                                  }
                                  
                                  setSelectedPlayerForSessions({
                                    timerId: timer.id,
                                    playerName: selectedPlayer
                                  });
                                }}
                                value={selectedPlayerForSessions?.timerId === timer.id ? selectedPlayerForSessions?.playerName : ""}
                              >
                                <option value="">View player sessions...</option>
                                {timer.players.map(player => (
                                  <option key={player} value={player}>
                                    {player} ({timer.playerTimes?.[player]?.sessions.length || 0} sessions)
                                  </option>
                                ))}
                              </select>
                              
                              {/* Display sessions for selected player */}
                              {selectedPlayerForSessions?.timerId === timer.id && selectedPlayerForSessions?.playerName && (
                                <div className="mt-2 max-h-28 overflow-y-auto text-xs">
                                  <div className="text-xs text-gray-400 mb-1">Sessions for {selectedPlayerForSessions.playerName}:</div>
                                  {timer.playerTimes?.[selectedPlayerForSessions.playerName]?.sessions.map((session, index) => (
                                    <div key={index} className="flex justify-between py-1 border-b border-gray-700">
                                      <span>{formatTime(session.startTime)}-{session.endTime ? formatTime(session.endTime) : 'Active'}</span>
                                      <span>{formatTime(session.duration)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <>
                          {/* Timer status and duration for standard timers */}
                          <div className="flex-1 flex flex-col items-center justify-center">
                            <div className="text-lg">
                              {timer.active ? (
                                <span className="text-green-500 flex items-center">
                                  <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse mr-2"></div>
                                  Running
                                </span>
                              ) : (
                                <span>Stopped</span>
                              )}
                            </div>
                            <div className="text-4xl font-bold mt-2">
                              {formatTime(timer.duration)}
                            </div>
                            {timer.active && timer.startTime !== null && (
                              <div className="text-sm text-blue-400 mt-1">
                                Current session: {formatTime(playerRef.current ? playerRef.current.getCurrentTime() - timer.startTime : 0)}
                              </div>
                            )}
                          </div>
                          
                          {/* Timer controls for standard timers */}
                          <div className="flex space-x-2 mt-2">
                            {!timer.active ? (
                              <button
                                onClick={() => startTimer(timer.id)}
                                className="flex-1 px-3 py-2 rounded bg-green-700 hover:bg-green-600 text-white"
                              >
                                Start
                              </button>
                            ) : (
                              <button
                                onClick={() => stopTimer(timer.id)}
                                className="flex-1 px-3 py-2 rounded bg-yellow-700 hover:bg-yellow-600 text-white"
                              >
                                Stop
                              </button>
                            )}
                            <button
                              onClick={() => resetTimer(timer.id)}
                              className="flex-1 px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white"
                            >
                              Reset
                            </button>
                          </div>

                          {/* Session list for standard timers */}
                          {timer.sessions.length > 0 && (
                            <div className="mt-3">
                              <div className="text-xs text-gray-400 mb-1">Sessions:</div>
                              <div className="max-h-28 overflow-y-auto text-xs">
                                {timer.sessions.map((session, index) => (
                                  <div key={index} className="flex justify-between py-1 border-b border-gray-700">
                                    <span>{formatTime(session.startTime)}-{session.endTime ? formatTime(session.endTime) : 'Active'}</span>
                                    <span>{formatTime(session.duration)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                  
                  {/* Add Timer Form */}
                  {showTimerForm ? (
                    <div className="p-4 border-t border-gray-800">
                      <input
                        type="text"
                        value={newTimerName}
                        onChange={e => setNewTimerName(e.target.value)}
                        placeholder="Timer name (e.g. player name)"
                        className="w-full mb-2 px-3 py-2 rounded bg-gray-800 border border-gray-700 text-white"
                      />
                      <select
                        value={newTimerType}
                        onChange={e => setNewTimerType(e.target.value as 'standard' | 'player-based')}
                        className="w-full mb-2 px-3 py-2 rounded bg-gray-800 border border-gray-700 text-white"
                      >
                        <option value="standard">Standard (accumulates)</option>
                        <option value="player-based">Player-based (per player)</option>
                      </select>
                      
                      {/* Player input fields (only shown for player-based timers) */}
                      {newTimerType === 'player-based' && (
                        <div className="mb-3 border border-gray-700 rounded p-2">
                          <label className="text-sm text-gray-400 mb-1 block">Add Players:</label>
                          <div className="flex mb-2">
                            <input
                              type="text"
                              value={newTimerPlayerName}
                              onChange={e => setNewTimerPlayerName(e.target.value)}
                              onKeyPress={e => e.key === 'Enter' && addPlayerToTimerForm(newTimerPlayerName)}
                              placeholder="Player name"
                              className="flex-1 px-3 py-2 rounded-l bg-gray-800 border border-gray-700 text-white"
                            />
                            <button
                              onClick={() => addPlayerToTimerForm(newTimerPlayerName)}
                              className="px-3 py-2 rounded-r bg-blue-700 hover:bg-blue-600 text-white"
                            >
                              Add
                            </button>
                          </div>
                          {newTimerPlayers.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {newTimerPlayers.map(player => (
                                <div key={player} className="flex items-center space-x-1 px-2 py-1 rounded text-sm bg-blue-900 text-blue-100">
                                  <span>{player}</span>
                                  <button onClick={() => removePlayerFromTimerForm(player)} className="hover:text-red-500">×</button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={saveTimer}
                          className="flex-1 px-3 py-2 rounded bg-green-700 hover:bg-green-600 text-white"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setShowTimerForm(false)}
                          className="flex-1 px-3 py-2 rounded bg-gray-700 hover:bg-gray-600 text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 border-t border-gray-800">
                      <button
                        onClick={handleAddTimer}
                        className="w-full px-3 py-2 rounded bg-blue-700 hover:bg-blue-600 text-white"
                      >
                        Add Timer
                      </button>
                    </div>
                  )}
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
                  if (selectedCounterId) {
                    addPlayerToCounter(selectedCounterId, addPlayerName);
                  } else if (selectedTimerId) {
                    addPlayerToTimer(selectedTimerId, addPlayerName);
                  }
                  setShowAddPlayerForm(false);
                  setAddPlayerName('');
                }
              }}
              placeholder="Player name"
              className="w-full mb-4 px-3 py-2 rounded bg-gray-700 border border-gray-600 text-white"
              autoFocus
            />
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  if (selectedCounterId) {
                    addPlayerToCounter(selectedCounterId, addPlayerName);
                  } else if (selectedTimerId) {
                    addPlayerToTimer(selectedTimerId, addPlayerName);
                  }
                  setShowAddPlayerForm(false);
                  setAddPlayerName('');
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