'use client'
import { useState, useEffect, useRef, Fragment, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { withAuth } from '@/components/auth'
import { useTheme } from '@/contexts/ThemeContext'
import { useRouter } from 'next/router'
import { toast } from 'react-toastify'
// import ClipPlayer from '@/components/ClipPlayer' // Assuming ClipPlayer might be unused now if all playback is through VideoPlayer
import TimersSection from '@/components/timers/TimersSection'
// import { PlayerTimer, TimerSession } from '@/components/timers/TimerInterfaces' // Check if still directly used
import CountersSection from '@/components/counters/CountersSection'
// Only imported for types, no longer using the implementation directly
// import type { CounterType, CountTracker } from '@/components/counters/CounterInterfaces' // Check if still directly used
import VideoPlayer, { VideoPlayerControls } from '@/components/VideoPlayer'
import AnalysisSidebar from '@/components/AnalysisSidebar'
import { ClipMarker } from '@/types/clips'
import { useClips } from '@/hooks/useClips'

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

// VeoPlayer interface removed as it's no longer used by VideoPlayer or AnalysisSidebar
// export interface VeoPlayer { 
//   getCurrentTime: () => number;
//   seekTo: (seconds: number) => void;
//   playVideo: () => void;
//   pauseVideo: () => void;
//   getPlayerState: () => number;
// }

// ClipMarker interface moved to @/types/clips.ts
// export interface ClipMarker {
//   id: string;
//   startTime: number;
//   endTime: number;
//   title: string;
//   comment: string;
//   labels: string[];
// }

// Now using imported CounterType and CountTracker from '@/components/counters/CounterInterfaces' - verify direct usage
// Now using imported PlayerTimer and TimerSession from '@/components/timers/TimerInterfaces' - verify direct usage

function AnalyzeVideoPage({ user }: { user: any }) {
  const router = useRouter()
  const { isDarkMode } = useTheme() // isDarkMode is used by AnalysisSidebar via useTheme, but keep here if analyze-video itself needs it directly
  const [videos, setVideos] = useState<Video[]>([])
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null)
  const [loading, setLoading] = useState(true)
  const [playerReady, setPlayerReady] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [playerState, setPlayerState] = useState<'playing' | 'paused'>('paused')
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null)
  
  // For player form modal
  const [showAddPlayerForm, setShowAddPlayerForm] = useState(false)
  const [selectedCounterId, setSelectedCounterId] = useState<string | null>(null)
  const [selectedTimerId, setSelectedTimerId] = useState<string | null>(null)
  const [addPlayerName, setAddPlayerName] = useState('')
  const [onConfirmAddPlayerForModal, setOnConfirmAddPlayerForModal] = useState<((playerName: string) => void) | null>(null)
  
  const playerRef = useRef<VideoPlayerControls>(null)

  // Track which sidebar tab is active
  const [sidebarTab, setSidebarTab] = useState<'clips' | 'counters' | 'createClip' | 'timers' | null>('clips')
  const [lastSidebarTab, setLastSidebarTab] = useState<'clips' | 'counters' | 'createClip' | 'timers'>('clips')

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

  // Initialize useClips hook
  const {
    clipMarkers,
    loadingClips,
    isRecording,
    recordingStart,
    recordingElapsed,
    clipDuration,
    isSavingClip,
    recentLabels,
    startRecording: hookStartRecording,
    stopRecording: hookStopRecording,
    saveClip: hookSaveClip,
    cancelClipCreation: hookCancelClipCreation,
    playClip: hookPlayClip,
  } = useClips({
    supabase,
    userId: user?.id,
    selectedVideo,
    playerRef,
    onNotifiy: setNotification,
  });

  // When sidebarVisible changes, clear or restore the selected tab
  useEffect(() => {
    if (!sidebarVisible) {
      if (sidebarTab) setLastSidebarTab(sidebarTab)
      setSidebarTab(null)
    } else if (sidebarTab === null) {
      setSidebarTab(lastSidebarTab)
    }
  }, [sidebarVisible, sidebarTab, lastSidebarTab]); // Added lastSidebarTab to dependencies

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
            'and(source.eq.veo,url.not.is.null,url.not.like.%https://app.veo.co%)' // This Veo condition might need review if all Veo URLs are direct now
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
    
    // YouTube API loading is handled by VideoPlayer.tsx
    // Cleanup for intervalRef is no longer needed here
  }, [])
  
  // Initialize player related states when selected video changes
  useEffect(() => {
    if (!selectedVideo) {
      setPlayerReady(false);
      return;
    }
    // VideoPlayer component handles its own initialization and cleanup.
    // Resetting states like playerReady here is appropriate.
  }, [selectedVideo])
  
  // handleVideoSelect is now mostly handled by onVideoSelect in AnalysisSidebar, 
  // but the core logic of finding and setting the video, and resetting recording state, remains here.
  const handleSelectVideo = useCallback((videoToSelect: Video | null) => {
    setSelectedVideo(videoToSelect);
    // isRecording and recordingStart are managed by useClips based on selectedVideo changes (or manually)
    // clipMarkers are also managed by useClips based on selectedVideo
  }, [setSelectedVideo]);

  const formatTime = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);
  
  const handleStartRecording = useCallback(() => {
    hookStartRecording(); // Call hook function
    if (sidebarTab !== 'createClip') {
      setSidebarTab('createClip');
    }
  }, [hookStartRecording, sidebarTab, setSidebarTab]);
  
  const handleStopRecording = useCallback(() => {
    const { success, newClipDuration } = hookStopRecording(); // Call hook function
    if (success) {
      // clipDuration state in useClips is already updated by hookStopRecording.
      // No need to setClipDuration here if AnalysisSidebar reads clipDuration from useClips directly.
    }
    if (sidebarTab !== 'createClip' && success) { // Only switch if stop was successful and led to clip creation form
      setSidebarTab('createClip');
    }
    // If not successful (e.g., too short), notification is handled by useClips.
    // setIsRecording(false) is handled by useClips.
  }, [hookStopRecording, sidebarTab, setSidebarTab]);
  
  const handleSaveClip = useCallback(async (clipFormData: { title: string; comment: string; labels: string[] }) => {
    if (!selectedVideo || recordingStart === null || !user) {
        setNotification({message: 'Cannot save clip: Missing required info.', type: 'error'});
        return;
    }

    const result = await hookSaveClip(clipFormData); // Call hook function

    if (result.success) {
      setSidebarTab('clips');
      // recentLabels is updated within useClips
      // clipMarkers are updated within useClips
      // recordingStart, clipDuration are reset within useClips
      // playerRef.current?.playVideo() is called by useClips
      // Notification is handled by useClips
    } else {
      // Notification for failure is handled by useClips
    }
  }, [selectedVideo, recordingStart, user, hookSaveClip, setSidebarTab, setNotification]); // Added hookSaveClip
  
  const cancelClipCreation = useCallback(() => {
    hookCancelClipCreation(); // Call hook function
    setSidebarTab('clips');
    // playerRef.current?.playVideo() is called by useClips
    // recordingStart is reset by useClips
  }, [hookCancelClipCreation, setSidebarTab]);
  
  // Removed local playClip function, use hookPlayClip directly

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
  }, []); // playerRef is stable

  // Memoized callbacks for VideoPlayer
  const handlePlayerReady = useCallback(() => {
    setPlayerReady(true);
  }, [setPlayerReady]);

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, [setCurrentTime]);

  const handlePlayerStateChange = useCallback((newState: 'playing' | 'paused' | 'ended' | 'buffering' | 'cued') => {
    if (newState === 'playing') {
      setPlayerState('playing');
    } else if (newState === 'paused' || newState === 'ended') {
      setPlayerState('paused');
    }
  }, [setPlayerState]);

  const handlePlayerPlay = useCallback(() => {
    setPlayerState('playing');
    // console.log("Video started playing"); // Can be removed if not needed for debug
  }, [setPlayerState]);

  const handlePlayerPause = useCallback(() => {
    setPlayerState('paused');
    // console.log("Video paused/stopped"); // Can be removed if not needed for debug
  }, [setPlayerState]);

  const handlePlayerError = useCallback((error: { message?: string; [key: string]: any }) => {
    console.error("Video Player Error:", error);
    setNotification({ message: error.message || 'Video player error', type: 'error' });
    setPlayerReady(false);
  }, [setNotification, setPlayerReady]);

  // Props for AnalysisSidebar
  const analysisSidebarProps = {
    user,
    videos,
    selectedVideo,
    onVideoSelect: (videoId: string | null) => {
      if (videoId) {
        const video = videos.find(v => v.id === videoId);
        handleSelectVideo(video || null);
      } else {
        handleSelectVideo(null);
      }
    },
    sidebarTab: sidebarTab!,
    playerRef,
    currentTime,
    playerState,
    onSeekToPlayer: (time: number) => {
      if (playerRef.current) {
        playerRef.current.seekTo(time, true);
        playerRef.current.playVideo();
      }
    },
    // Props from useClips
    clipMarkers,
    loadingClips,
    isRecording,
    recordingStart,
    recordingElapsed,
    clipDuration,
    isSavingClip,
    recentLabels,
    // Adapted handlers
    onStartRecording: handleStartRecording,
    onStopRecording: handleStopRecording,
    onSaveClip: handleSaveClip,
    onCancelClipCreation: cancelClipCreation,
    onPlayClip: hookPlayClip, // Pass directly from hook
    
    onShowConfirmModal: (config: any) => {
      setConfirmModalConfig(config);
      setShowConfirmModal(true);
    },
    onShowAddPlayerFormForCounters: (counterId: string, onConfirm: (playerName: string) => void) => {
      setSelectedCounterId(counterId);
      setSelectedTimerId(null);
      setOnConfirmAddPlayerForModal(() => onConfirm);
      setShowAddPlayerForm(true);
    },
    onShowAddPlayerFormForTimers: (timerId: string) => {
      setSelectedTimerId(timerId);
      setSelectedCounterId(null);
      setOnConfirmAddPlayerForModal(null);
      setShowAddPlayerForm(true);
    },
    formatTime,
    onSetSidebarTab: setSidebarTab,
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
                onPlayerReady={handlePlayerReady}
                onTimeUpdate={handleTimeUpdate}
                onStateChange={handlePlayerStateChange}
                onPlay={handlePlayerPlay}
                onPause={handlePlayerPause}
                onError={handlePlayerError}
                className="aspect-video bg-black w-full max-w-full"
              />
            </div>
          ) : (
            <div className="text-gray-400 text-lg">Select a video to begin</div>
          )}
        </div>

        {sidebarVisible && <AnalysisSidebar {...analysisSidebarProps} />}

        {/* Far Right Sidebar for navigation */}
        <div className="flex flex-col w-16 bg-gray-950 border-l border-gray-800 items-center py-4 space-y-4">
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
          <button
            className={`w-10 h-10 flex items-center justify-center rounded-lg ${sidebarTab === 'createClip' && sidebarVisible ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
            onClick={() => { setSidebarTab('createClip'); setLastSidebarTab('createClip'); }}
            title="Create Clip"
            disabled={!sidebarVisible || !selectedVideo} // Disable if no video selected
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
            disabled={!sidebarVisible || !selectedVideo} // Disable if no video selected
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </button>
          <button
            className={`w-10 h-10 flex items-center justify-center rounded-lg ${sidebarTab === 'timers' && sidebarVisible ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
            onClick={() => { setSidebarTab('timers'); setLastSidebarTab('timers'); }}
            title="Show Timers"
            disabled={!sidebarVisible || !selectedVideo} // Disable if no video selected
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
                    // For timers, player addition might be handled differently or directly within TimersSection
                    // This toast is indicative, actual logic might be in TimersSection's onShowAddPlayerForm prop
                    toast.info("Player addition for timers is managed by TimersSection or needs specific callback handling.");
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
                    toast.info("Player addition for timers is managed by TimersSection or needs specific callback handling.");
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