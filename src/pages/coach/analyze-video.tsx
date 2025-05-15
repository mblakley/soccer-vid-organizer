'use client'
import { useState, useEffect, useRef, Fragment, useCallback } from 'react'
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
import VideoPlayer, { VideoPlayerControls } from '@/components/VideoPlayer'
import AnalysisSidebar from '@/components/AnalysisSidebar'

// Add import for YouTube types
// The types are automatically included from @types/youtube

export interface Video {
  id: string;
  video_id: string;
  title: string;
  source: string;
  duration?: number;
  url?: string;
}

// Add Veo player interface
export interface VeoPlayer {
  getCurrentTime: () => number;
  seekTo: (seconds: number) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  getPlayerState: () => number;
}

export interface ClipMarker {
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
  const playerRef = useRef<VideoPlayerControls>(null)
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
    
    return () => {
      // Clean up interval on unmount
      // if (intervalRef.current) { // This interval is removed
      //   clearInterval(intervalRef.current)
      // }
    }
  }, [])
  
  // Initialize player when selected video changes
  useEffect(() => {
    if (!selectedVideo) {
      setPlayerReady(false); // Reset player ready state
      return;
    }
    
    // The VideoPlayer component now handles its own initialization.
    // We might still want to reset certain states here when video changes.
    // For instance, if playerRef.current exists, we might want to ensure it's paused.
    // playerRef.current?.pauseVideo(); // Example

    // Cleanup is handled by VideoPlayer's own useEffect
    return () => {
      // Any specific cleanup related to analyze-video when video changes, if necessary
    };
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
  
  const handleStartRecording = useCallback(() => {
    if (!playerRef.current) return;
    
    const currentVideoTime = playerRef.current.getCurrentTime();
    setRecordingStart(currentVideoTime);
    setIsRecording(true);
    // Optionally switch to createClip tab if not already there
    // setSidebarTab('createClip'); 
  }, []);
  
  const handleStopRecording = useCallback(() => {
    if (!playerRef.current || recordingStart === null) return;
    
    const endTime = playerRef.current.getCurrentTime();
    // Only proceed if we have a valid clip (at least 1 second long)
    if (endTime - recordingStart < 1) {
      setNotification({
        message: 'Clip is too short (minimum 1 second)',
        type: 'error'
      });
      setIsRecording(false); // Still need to set isRecording to false
      // No need to switch tab here, user might want to try recording again from 'createClip' tab
      return;
    }
    
    // Calculate and store duration
    const duration = endTime - recordingStart;
    setClipDuration(duration);
    
    // Pause the video when ending the clip recording
    playerRef.current.pauseVideo();
    
    // Set up for the clip form display in AnalysisSidebar
    setIsRecording(false); 
    // recordingStart remains set, which AnalysisSidebar uses to show the form

    // Ensure the sidebar is on the 'createClip' tab to show the save form
    if (sidebarTab !== 'createClip') {
      setSidebarTab('createClip');
    }
  }, [recordingStart, playerRef, setNotification, setClipDuration, setIsRecording, sidebarTab, setSidebarTab]);
  
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
  
  const formatTime = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);
  
  const handleSaveClip = useCallback(async (clipFormData: { title: string; comment: string; labels: string[] }) => {
    if (!selectedVideo || recordingStart === null || !playerRef.current || !user) return;
    
    const { title, comment, labels } = clipFormData;

    try {
      setIsSavingClip(true);
      
      const endTime = playerRef.current.getCurrentTime();
      
      // Get the current session to include the access token
      const { data: sessionData } = await supabase.auth.getSession()
      const session = sessionData.session
      
      if (!session) {
        throw new Error('No active session')
      }
      
      // Create the clip via API endpoint
      const clipPayload = {
        title: title.trim() || `Clip at ${formatTime(recordingStart)}`,
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
      if (labels.length > 0) {
        const updatedRecentLabels = [...labels, ...recentLabels]
          .filter((label, index, self) => self.indexOf(label) === index)
          .slice(0, 20);
        setRecentLabels(updatedRecentLabels);
      }
      
      // Create the comment via API endpoint if provided
      if (comment.trim()) {
        const commentPayload = {
          clip_id: clipId,
          user_id: user.id,
          content: comment,
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
      if (labels.length > 0) {
        const labelsString = `LABELS: ${labels.join(', ')}`;
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
        title: title.trim() || `Clip at ${formatTime(recordingStart)}`,
        comment: comment,
        labels: [...labels]
      };
      setClipMarkers(prev => [...prev, newClip].sort((a,b) => b.startTime - a.startTime)); // Keep sorted
      
      // Reset form related state - some are now internal to sidebar, parent resets what it owns
      // setClipTitle(''); // Internal to sidebar
      // setClipComment(''); // Internal to sidebar
      // setClipLabels([]); // Internal to sidebar
      setShowClipForm(false); // Or rather, switch tab
      setSidebarTab('clips'); // Switch to clips tab after saving
      setRecordingStart(null);
      setClipDuration(0);
      
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
  }, [selectedVideo, recordingStart, user, recentLabels, formatTime]);
  
  const cancelClipCreation = useCallback(() => {
    // setShowClipForm(false); // Switch tab instead
    setSidebarTab('clips');
    setRecordingStart(null);
    // Clip form fields (title, comment, labels) are reset internally by AnalysisSidebar
    
    // Resume video playback when canceling clip creation
    if (playerRef.current) {
      playerRef.current.playVideo();
    }
  }, [/* playerRef is stable, setSidebarTab */]);
  
  const playClip = useCallback((clip: ClipMarker) => {
    if (!playerRef.current) return;
    
    playerRef.current.seekTo(clip.startTime, true);
    playerRef.current.playVideo();
    
    // Optional: We could set up code to pause at the end time
    // by checking current time in the interval
  }, []);

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
      const currentVideoTime = playerRef.current.getCurrentTime();
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        playerRef.current.seekTo(Math.max(0, currentVideoTime - 5), true);
        didSeek = true;
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        playerRef.current.seekTo(currentVideoTime + 5, true);
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

  // Memoized callbacks for VideoPlayer
  const handlePlayerReady = useCallback(() => {
    setPlayerReady(true);
    // Potentially auto-play or other logic here
  }, []);

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const handlePlayerStateChange = useCallback((newState: 'playing' | 'paused' | 'ended' | 'buffering' | 'cued') => {
    if (newState === 'playing') {
      setPlayerState('playing');
    } else if (newState === 'paused' || newState === 'ended') {
      setPlayerState('paused');
    }
  }, []);

  const handlePlayerPlay = useCallback(() => {
    setPlayerState('playing');
    console.log("Video started playing");
  }, []);

  const handlePlayerPause = useCallback(() => {
    setPlayerState('paused');
    console.log("Video paused/stopped");
  }, []);

  const handlePlayerError = useCallback((error: { message?: string; [key: string]: any }) => {
    console.error("Video Player Error:", error);
    setNotification({ message: error.message || 'Video player error', type: 'error' });
    setPlayerReady(false);
  }, []);

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
              {/* Replace old player logic with the new VideoPlayer component */}
              <VideoPlayer
                ref={playerRef}
                video={selectedVideo}
                onPlayerReady={handlePlayerReady}
                onTimeUpdate={handleTimeUpdate}
                onStateChange={handlePlayerStateChange}
                onPlay={handlePlayerPlay}
                onPause={handlePlayerPause}
                onError={handlePlayerError}
                className="aspect-video bg-black w-full max-w-full" // Apply similar styling
                // width="100%" // Default
                // height="100%" // Default
              />
            </div>
          ) : (
            <div className="text-gray-400 text-lg">Select a video to begin</div>
          )}
        </div>

        {/* Right Sidebar: Video selection, Clips or Counters */}
        {sidebarVisible && (
          <AnalysisSidebar
            user={user}
            videos={videos}
            selectedVideo={selectedVideo}
            onVideoSelect={(videoId) => {
              const video = videos.find(v => v.id === videoId);
              setSelectedVideo(video || null);
              if (video) {
                setIsRecording(false);
                setRecordingStart(null);
              }
            }}
            sidebarTab={sidebarTab!}
            playerRef={playerRef}
            currentTime={currentTime}
            playerState={playerState}
            onSeekToPlayer={(time) => {
              if (playerRef.current) {
                playerRef.current.seekTo(time, true);
                playerRef.current.playVideo(); // Usually want to play after seeking to a counter event
              }
            }}
            clipMarkers={clipMarkers}
            loadingClips={loadingClips}
            onPlayClip={playClip} // Pass the memoized playClip
            isRecording={isRecording}
            recordingStart={recordingStart}
            recordingElapsed={recordingElapsed}
            clipDuration={clipDuration}
            onStartRecording={handleStartRecording} // Pass memoized handler
            onStopRecording={handleStopRecording} // Pass memoized handler
            onSaveClip={handleSaveClip} // Pass memoized handler
            onCancelClipCreation={cancelClipCreation} // Pass memoized handler
            isSavingClip={isSavingClip}
            recentLabels={recentLabels}
            onShowConfirmModal={(config) => {
              setConfirmModalConfig(config);
              setShowConfirmModal(true);
            }}
            onShowAddPlayerFormForCounters={(counterId, onConfirm) => {
              setSelectedCounterId(counterId);
              setSelectedTimerId(null);
              setOnConfirmAddPlayerForModal(() => onConfirm); // Correctly wrap onConfirm
              setShowAddPlayerForm(true);
            }}
            onShowAddPlayerFormForTimers={(timerId) => {
              setSelectedTimerId(timerId);
              setSelectedCounterId(null);
              setOnConfirmAddPlayerForModal(null); // Timer section handles its own player add confirmation
              setShowAddPlayerForm(true);
            }}
            formatTime={formatTime} // Pass memoized formatTime
            onSetSidebarTab={setSidebarTab} // Pass setSidebarTab
          />
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
              onKeyDown={e => {
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