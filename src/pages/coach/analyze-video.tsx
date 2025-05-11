'use client'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseClient'
import withAuth from '@/components/withAuth'
import { useTheme } from '@/contexts/ThemeContext'
import { useRouter } from 'next/router'

// Type declaration for YouTube Player API
declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string,
        options: {
          videoId: string;
          height: string | number;
          width: string | number;
          playerVars?: {
            autoplay?: number;
            controls?: number;
            modestbranding?: number;
            rel?: number;
            [key: string]: any;
          };
          events?: {
            onReady?: () => void;
            onStateChange?: (event: {data: number}) => void;
            [key: string]: any;
          };
        }
      ) => {
        getCurrentTime: () => number;
        seekTo: (seconds: number, allowSeekAhead: boolean) => void;
        playVideo: () => void;
        pauseVideo: () => void;
        getPlayerState: () => number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface Video {
  id: string;
  video_id: string;
  title: string;
  source: string;
  duration?: number;
  url?: string;
}

interface ClipMarker {
  id: string;
  startTime: number;
  endTime: number;
  title: string;
  comment: string;
  labels: string[];
}

interface CountTracker {
  id: string;
  name: string;
  count: number;
  timestamps: number[];
}

function AnalyzeVideoPage({ user }: { user: any }) {
  const router = useRouter()
  const { isDarkMode } = useTheme()
  const [videos, setVideos] = useState<Video[]>([])
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [loading, setLoading] = useState(true)
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
    
    // Only YouTube is supported for now
    if (selectedVideo.source !== 'youtube') {
      setNotification({
        message: 'Only YouTube videos are currently supported for analysis',
        type: 'error'
      })
      return
    }

    const initializePlayer = () => {
      // Clear any existing interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }

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
    }

    initializePlayer()
  }, [selectedVideo])
  
  const handleVideoSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const videoId = e.target.value
    if (!videoId) {
      setSelectedVideo(null)
      return
    }
    
    const video = videos.find(v => v.id === videoId)
    if (video) {
      setSelectedVideo(video)
      // Reset clip state when selecting a new video
      setClipMarkers([])
      setIsRecording(false)
      setRecordingStart(null)
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
  
  const saveCounter = () => {
    if (!newCounterName.trim()) {
      setNotification({
        message: 'Please enter a name for the counter',
        type: 'error'
      })
      return
    }
    
    const newCounter: CountTracker = {
      id: `counter-${Date.now()}`,
      name: newCounterName,
      count: 0,
      timestamps: []
    }
    
    setCounters([...counters, newCounter])
    setNewCounterName('')
    setShowCounterForm(false)
    
    setNotification({
      message: `Counter "${newCounterName}" added!`,
      type: 'success'
    })
    setTimeout(() => setNotification(null), 3000)
  }
  
  const incrementCounter = (counterId: string) => {
    if (!playerRef.current) return
    
    const currentTime = playerRef.current.getCurrentTime()
    
    setCounters(prevCounters => 
      prevCounters.map(counter => 
        counter.id === counterId
          ? {
              ...counter,
              count: counter.count + 1,
              timestamps: [...counter.timestamps, currentTime]
            }
          : counter
      )
    )
  }
  
  const removeCounter = (counterId: string) => {
    setCounters(prevCounters => 
      prevCounters.filter(counter => counter.id !== counterId)
    )
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
  
  return (
    <div className="w-full mx-0 p-0 space-y-6 mb-20">
      {/* Video selection - keep it in a contained area */}
      <div className="container mx-auto px-2 md:px-4">
        <div className="max-w-md">
          <label 
            htmlFor="video-select" 
            className="block mb-1 text-sm font-medium"
          >
            Select a video to analyze
          </label>
          <select
            id="video-select"
            className={`w-full border rounded px-3 py-1 text-sm ${
              isDarkMode 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300'
            }`}
            value={selectedVideo?.id || ''}
            onChange={handleVideoSelect}
          >
            <option value="">-- Select a video --</option>
            {videos.map(video => (
              <option key={video.id} value={video.id}>
                {video.title}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      {/* Video player with side counters - full width with no horizontal constraints */}
      {selectedVideo && (
        <>
          {/* Main video player and counters container - fullwidth with no margin */}
          <div className="flex flex-col md:flex-row w-full">
            {/* Video player container - absolute full width */}
            <div className="w-full md:flex-1">
              <div 
                ref={playerContainerRef} 
                className="aspect-video bg-black w-full h-full"
              ></div>
            </div>
            
            {/* Counters section - right side vertical stack with minimal width */}
            <div className="md:w-56 md:flex-shrink-0 p-2 md:p-3">
              <h3 className="font-medium mb-2 text-sm">Event Counters</h3>
              
              {/* Counter buttons - stacked vertically */}
              <div className="space-y-2">
                {counters.map(counter => (
                  <div 
                    key={counter.id}
                    className={`relative group p-2 border rounded ${
                      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-sm">{counter.name}</span>
                      <span className="text-base font-bold">{counter.count}</span>
                    </div>
                    <button
                      onClick={() => incrementCounter(counter.id)}
                      className={`mt-1 w-full px-2 py-1 rounded transition-colors text-center text-sm ${
                        isDarkMode
                          ? 'bg-gray-700 hover:bg-gray-600 text-white'
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                      }`}
                    >
                      Count
                    </button>
                    <button 
                      onClick={() => removeCounter(counter.id)}
                      className="absolute -top-2 -right-2 hidden group-hover:block bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                      title="Remove counter"
                    >
                      ×
                    </button>
                  </div>
                ))}
                
                {counters.length === 0 && !showCounterForm && (
                  <div className={`p-2 text-center text-xs ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    Add counters to track events during video playback
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Content below video - keep it in a contained area */}
          <div className="container mx-auto px-2 md:px-4">
            {/* Clip creation form */}
            {showClipForm && (
              <div className={`p-3 rounded border ${
                isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-300'
              }`}>
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
                      className={`w-full border rounded px-3 py-2 ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300'
                      }`}
                      placeholder="Enter a descriptive title (optional)"
                    />
                  </div>
                  
                  {/* Show clip duration */}
                  {clipDuration > 0 && (
                    <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      Clip duration: {formatTime(clipDuration)}
                    </div>
                  )}
                  
                  <div>
                    <label htmlFor="clip-comment" className="block mb-1 text-sm font-medium">
                      Coach's Comment
                    </label>
                    <textarea
                      id="clip-comment"
                      value={clipComment}
                      onChange={(e) => setClipComment(e.target.value)}
                      className={`w-full border rounded px-3 py-2 ${
                        isDarkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'bg-white border-gray-300'
                      }`}
                      rows={3}
                      placeholder="Add your analysis of this clip"
                    ></textarea>
                  </div>
                  
                  <div>
                    <label className="block mb-1 text-sm font-medium">
                      Labels/Tags (optional)
                    </label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <div className="flex w-full md:w-3/5">
                        <input
                          type="text"
                          value={newLabel}
                          onChange={(e) => setNewLabel(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addLabel(newLabel)}
                          className={`flex-grow border rounded-l px-3 py-2 ${
                            isDarkMode 
                              ? 'bg-gray-700 border-gray-600 text-white' 
                              : 'bg-white border-gray-300'
                          }`}
                          placeholder="Add labels (e.g., attack, defense, player name)"
                        />
                        <button
                          onClick={() => addLabel(newLabel)}
                          className={`px-3 py-2 rounded-r transition-colors ${
                            isDarkMode
                              ? 'bg-gray-700 hover:bg-gray-600 text-white'
                              : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                          }`}
                        >
                          Add
                        </button>
                      </div>
                      
                      {/* Recent labels buttons */}
                      <div className="flex flex-wrap gap-1 w-full md:w-2/5 md:pl-2">
                        {recentLabels.slice(0, 10).map(label => (
                          <button
                            key={label}
                            onClick={() => addLabel(label)}
                            className={`text-xs px-2 py-1 rounded transition-colors ${
                              clipLabels.includes(label)
                                ? isDarkMode ? 'bg-blue-800 text-white' : 'bg-blue-200 text-blue-800'
                                : isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-800'
                            } hover:opacity-80`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    {/* Display added labels */}
                    {clipLabels.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {clipLabels.map(label => (
                          <div
                            key={label}
                            className={`flex items-center space-x-1 px-2 py-1 rounded text-sm ${
                              isDarkMode ? 'bg-blue-900 text-blue-100' : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            <span>{label}</span>
                            <button
                              onClick={() => removeLabel(label)}
                              className="hover:text-red-500"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={handleSaveClip}
                      disabled={isSavingClip}
                      className={`px-4 py-2 rounded font-medium transition-colors ${
                        isDarkMode
                          ? 'bg-blue-700 hover:bg-blue-600 text-white'
                          : 'bg-blue-600 hover:bg-blue-500 text-white'
                      } ${isSavingClip ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {isSavingClip ? 'Saving...' : 'Save Clip'}
                    </button>
                    
                    <button
                      onClick={cancelClipCreation}
                      disabled={isSavingClip}
                      className={`px-4 py-2 rounded font-medium transition-colors ${
                        isDarkMode
                          ? 'bg-gray-700 hover:bg-gray-600 text-white'
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                      } ${isSavingClip ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Notification */}
            {notification && (
              <div className={`p-3 rounded ${
                notification.type === 'success' 
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {notification.message}
              </div>
            )}
            
            {/* Clips list */}
            {clipMarkers.length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-2">Created Clips</h3>
                <div className={`border rounded ${
                  isDarkMode ? 'border-gray-700' : 'border-gray-300'
                }`}>
                  {clipMarkers.map((clip, index) => (
                    <div 
                      key={clip.id}
                      className={`p-3 ${
                        index < clipMarkers.length - 1 
                          ? isDarkMode ? 'border-b border-gray-700' : 'border-b border-gray-300' 
                          : ''
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{clip.title}</h4>
                          <div className="text-sm mt-1">
                            {formatTime(clip.startTime)} - {formatTime(clip.endTime)} (Duration: {formatTime(clip.endTime - clip.startTime)})
                          </div>
                          
                          {/* Display labels */}
                          {clip.labels && clip.labels.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {clip.labels.map(label => (
                                <span 
                                  key={label}
                                  className={`px-2 py-0.5 text-xs rounded ${
                                    isDarkMode ? 'bg-blue-900 text-blue-100' : 'bg-blue-100 text-blue-800'
                                  }`}
                                >
                                  {label}
                                </span>
                              ))}
                            </div>
                          )}
                          
                          {clip.comment && (
                            <div className={`mt-2 p-2 rounded text-sm ${
                              isDarkMode ? 'bg-gray-800' : 'bg-gray-100'
                            }`}>
                              {clip.comment}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => playClip(clip)}
                          className={`px-3 py-1 rounded text-sm transition-colors ${
                            isDarkMode
                              ? 'bg-gray-700 hover:bg-gray-600 text-white'
                              : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                          }`}
                        >
                          Play
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Display counter history */}
            {counters.length > 0 && counters.some(c => c.timestamps.length > 0) && (
              <div>
                <h3 className="text-lg font-medium mb-2">Counter Statistics</h3>
                <div className={`border rounded p-3 ${
                  isDarkMode ? 'border-gray-700' : 'border-gray-300'
                }`}>
                  {counters.filter(c => c.timestamps.length > 0).map(counter => (
                    <div key={counter.id} className="mb-3 last:mb-0">
                      <h4 className="font-medium">{counter.name}: {counter.count} events</h4>
                      <div className="mt-1 text-sm">
                        <div className="flex flex-wrap gap-1">
                          {counter.timestamps.map((time, i) => (
                            <button 
                              key={i}
                              onClick={() => {
                                if (playerRef.current) {
                                  playerRef.current.seekTo(time, true)
                                  playerRef.current.playVideo()
                                }
                              }}
                              className={`px-2 py-0.5 rounded hover:underline ${
                                isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                              }`}
                            >
                              {formatTime(time)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Add counter form - shows as a modal when active */}
          {shouldShowCounterForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-20 flex items-center justify-center">
              <div className={`p-4 rounded shadow-lg max-w-md w-full ${
                isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
              }`}>
                <h3 className="text-lg font-medium mb-3">Add New Counter</h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={newCounterName}
                    onChange={(e) => setNewCounterName(e.target.value)}
                    placeholder="What are you counting?"
                    className={`w-full border rounded px-3 py-2 ${
                      isDarkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300'
                    }`}
                    autoFocus
                  />
                  <div className="flex space-x-2">
                    <button
                      onClick={saveCounter}
                      className={`flex-1 px-3 py-2 rounded transition-colors ${
                        isDarkMode
                          ? 'bg-green-700 hover:bg-green-600 text-white'
                          : 'bg-green-600 hover:bg-green-500 text-white'
                      }`}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setShowCounterForm(false)}
                      className={`flex-1 px-3 py-2 rounded transition-colors ${
                        isDarkMode
                          ? 'bg-gray-700 hover:bg-gray-600 text-white'
                          : 'bg-gray-300 hover:bg-gray-400 text-gray-800'
                      }`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      
      {/* Loading state and No videos message - keep them in a contained area */}
      <div className="container mx-auto px-2 md:px-4">
        {/* Loading state */}
        {loading && <p className="text-sm">Loading videos...</p>}
        
        {/* No videos available */}
        {!loading && videos.length === 0 && (
          <p className="text-sm">No videos available. Please import videos from the Videos page first.</p>
        )}
      </div>

      {/* Fixed bottom recording controls with status indicator */}
      {isRecording && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-opacity-95 z-10 flex justify-center items-center"
          style={{ backgroundColor: isDarkMode ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)' }}
        >
          <div className="flex items-center mr-4">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse mr-2"></div>
            <span>
              Recording from {recordingStart !== null ? formatTime(recordingStart) : '0:00'}
            </span>
          </div>
          
          <button
            onClick={handleStopRecording}
            className={`px-6 py-3 rounded-full font-medium text-lg transition-colors ${
              isDarkMode
                ? 'bg-gray-700 hover:bg-gray-600 text-white'
                : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
            }`}
          >
            End Clip
          </button>
        </div>
      )}

      {/* Fixed Action Buttons at bottom of screen */}
      {shouldShowFixedButtons && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-opacity-95 z-10 flex justify-center space-x-4"
          style={{ backgroundColor: isDarkMode ? 'rgba(17, 24, 39, 0.95)' : 'rgba(255, 255, 255, 0.95)' }}
        >
          <button
            onClick={handleStartRecording}
            className={`px-6 py-3 rounded-full font-medium text-lg transition-colors ${
              isDarkMode
                ? 'bg-red-700 hover:bg-red-600 text-white'
                : 'bg-red-600 hover:bg-red-500 text-white'
            }`}
          >
            Start Clip
          </button>
          
          <button
            onClick={handleAddCounter}
            className={`px-6 py-3 rounded-full font-medium text-lg transition-colors ${
              isDarkMode
                ? 'bg-blue-700 hover:bg-blue-600 text-white'
                : 'bg-blue-600 hover:bg-blue-500 text-white'
            }`}
          >
            Add Counter
          </button>
        </div>
      )}
    </div>
  )
}

// Allow coaches to access this page
export default withAuth(AnalyzeVideoPage, ['coach'], 'Analyze Video') 