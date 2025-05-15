'use client'
import { useState, useEffect } from 'react'
import { Video } from '@/pages/coach/analyze-video'
import { VideoPlayerControls } from '@/components/VideoPlayer'
import CountersSection from '@/components/counters/CountersSection'
import TimersSection from '@/components/timers/TimersSection'
import ClipList from '@/components/ClipList'
import ClipCreator from '@/components/clips/ClipCreator'
import { useTheme } from '@/contexts/ThemeContext'
import { supabase } from '@/lib/supabaseClient'
import { useClips } from '@/hooks/useClips'
import { toast } from 'react-toastify'

export type AnalysisTabType = 'clips' | 'counters' | 'createClip' | 'timers';

export interface AnalysisSidebarProps {
  user: any;
  videos: Video[];
  selectedVideo: Video | null;
  onVideoSelect: (videoId: string | null) => void;
  playerRef: React.RefObject<VideoPlayerControls | null>;
  currentTime: number;
  playerState: 'playing' | 'paused';
  formatTime: (seconds: number) => string;
}

const AnalysisSidebar: React.FC<AnalysisSidebarProps> = ({
  user,
  videos,
  selectedVideo,
  onVideoSelect,
  playerRef,
  currentTime,
  playerState,
  formatTime,
}) => {
  const { isDarkMode } = useTheme();
  
  // Internal state for managing content visibility and active tab
  const [isContentVisible, setIsContentVisible] = useState(true);
  const [activeTab, setActiveTab] = useState<AnalysisTabType | null>('clips');
  const [lastActiveTab, setLastActiveTab] = useState<AnalysisTabType>('clips');

  // Existing state for modals, notifications, useClips hook
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmModalConfig, setConfirmModalConfig] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [showAddPlayerForm, setShowAddPlayerForm] = useState(false);
  const [selectedCounterId, setSelectedCounterId] = useState<string | null>(null);
  const [selectedTimerId, setSelectedTimerId] = useState<string | null>(null);
  const [addPlayerName, setAddPlayerName] = useState('');
  const [onConfirmAddPlayerForModal, setOnConfirmAddPlayerForModal] = useState<((playerName: string) => void) | null>(null);
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const {
    clipMarkers,
    loadingClips,
    isRecording,
    recordingStart,
    recordingElapsed,
    clipDuration,
    isSavingClip,
    recentLabels,
    startRecording,
    stopRecording,
    saveClip,
    cancelClipCreation,
    playClip,
  } = useClips({
    supabase,
    userId: user?.id,
    selectedVideo,
    playerRef,
    onNotifiy: setNotification,
  });
  
  const seekToPlayer = (time: number) => {
    if (playerRef.current) {
      playerRef.current.seekTo(time, true);
      playerRef.current.playVideo();
    }
  };
  
  const handleStartRecording = () => {
    startRecording();
    setActiveTab('createClip');
    setLastActiveTab('createClip');
    if (!isContentVisible) setIsContentVisible(true);
  };
  
  const handleStopRecording = () => {
    const { success } = stopRecording();
    if (success) {
      setActiveTab('createClip');
      setLastActiveTab('createClip');
      if (!isContentVisible) setIsContentVisible(true);
    }
  };
  
  const handleSaveClip = async (clipFormData: { title: string; comment: string; labels: string[] }) => {
    if (!selectedVideo || recordingStart === null || !user) {
      setNotification({message: 'Cannot save clip: Missing required info.', type: 'error'});
      return;
    }
    const result = await saveClip(clipFormData);
    if (result.success) {
      setActiveTab('clips');
      setLastActiveTab('clips');
      if (!isContentVisible) setIsContentVisible(true);
    }
  };
  
  const handleCancelClipCreation = () => {
    cancelClipCreation();
    setActiveTab('clips');
    setLastActiveTab('clips');
    if (!isContentVisible) setIsContentVisible(true);
  };
  
  const handleShowConfirmModal = (config: { title: string; message: string; onConfirm: () => void; }) => {
    setConfirmModalConfig(config);
    setShowConfirmModal(true);
  };
  
  const handleShowAddPlayerFormForCounters = (counterId: string, onConfirm: (playerName: string) => void) => {
    setSelectedCounterId(counterId);
    setSelectedTimerId(null);
    setOnConfirmAddPlayerForModal(() => onConfirm);
    setShowAddPlayerForm(true);
  };
  
  const handleShowAddPlayerFormForTimers = (timerId: string) => {
    setSelectedTimerId(timerId);
    setSelectedCounterId(null);
    setOnConfirmAddPlayerForModal(null);
    setShowAddPlayerForm(true);
  };
  
  useEffect(() => {
    if (notification) {
      if (notification.type === 'success') toast.success(notification.message);
      else toast.error(notification.message);
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleToggleContentVisibility = () => {
    const newVisibility = !isContentVisible;
    setIsContentVisible(newVisibility);
    if (newVisibility) {
      setActiveTab(lastActiveTab);
    } else {
      if (activeTab) {
        setLastActiveTab(activeTab);
      }
      setActiveTab(null);
    }
  };

  const handleFarRightTabClick = (tab: AnalysisTabType) => {
    setActiveTab(tab);
    setLastActiveTab(tab);
    if (!isContentVisible) {
      setIsContentVisible(true);
    }
  };

  return (
    <div className="flex h-full"> 
      {isContentVisible && (
        <div className="w-[350px] bg-gray-900 text-white flex flex-col border-l border-r border-gray-800 overflow-y-auto h-full">
          <div className="p-4 border-b border-gray-800">
            <label htmlFor="video-select" className="block mb-1 text-sm font-medium">Select a video</label>
            <select
              id="video-select"
              className="w-full border rounded px-3 py-1 text-sm bg-gray-800 border-gray-700 text-white"
              value={selectedVideo?.id || ''}
              onChange={(e) => onVideoSelect(e.target.value || null)}
            >
              <option value="">-- Select a video --</option>
              {videos.map(video => (
                <option key={video.id} value={video.id}>{video.title}</option>
              ))}
            </select>
          </div>
          {activeTab && (
             <div className="p-4 border-b border-gray-800 font-bold text-lg flex items-center">
                {activeTab === 'clips' ? 'Clips' : activeTab === 'counters' ? 'Counters' : activeTab === 'timers' ? 'Timers' : 'Create Clip'}
             </div>
          )}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'clips' ? (
              <ClipList 
                clipMarkers={clipMarkers}
                loadingClips={loadingClips}
                currentTime={currentTime}
                formatTime={formatTime}
                onPlayClip={playClip}
              />
            ) : activeTab === 'counters' ? (
              <CountersSection
                userId={user?.id}
                videoId={selectedVideo?.id}
                formatTime={formatTime}
                onShowConfirmModal={handleShowConfirmModal}
                onShowAddPlayerForm={handleShowAddPlayerFormForCounters}
                currentTime={currentTime}
                playerState={playerState}
                onSeekTo={seekToPlayer}
              />
            ) : activeTab === 'timers' ? (
              <TimersSection 
                userId={user?.id}
                videoId={selectedVideo?.id}
                formatTime={formatTime}
                onShowConfirmModal={handleShowConfirmModal}
                onShowAddPlayerForm={handleShowAddPlayerFormForTimers}
              />
            ) : activeTab === 'createClip' ? (
              <ClipCreator
                isRecording={isRecording}
                recordingStart={recordingStart}
                recordingElapsed={recordingElapsed}
                clipDuration={clipDuration}
                recentLabels={recentLabels}
                isSavingClip={isSavingClip}
                formatTime={formatTime}
                isDarkMode={isDarkMode}
                playerRef={playerRef}
                onStartRecording={handleStartRecording}
                onStopRecording={handleStopRecording}
                onSaveClip={handleSaveClip}
                onCancelClipCreation={handleCancelClipCreation}
              />
            ) : null}
          </div>
        </div>
      )}

      <div className="flex flex-col w-16 bg-gray-950 border-l border-gray-800 items-center py-4 space-y-4 h-full">
        <button
          className={`w-10 h-10 flex items-center justify-center rounded-lg ${!isContentVisible ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
          onClick={handleToggleContentVisibility}
          title={isContentVisible ? 'Hide Panel' : 'Show Panel'}
        >
          {isContentVisible ? (
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
          className={`w-10 h-10 flex items-center justify-center rounded-lg ${activeTab === 'createClip' && isContentVisible ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
          onClick={() => handleFarRightTabClick('createClip')}
          title="Create Clip"
          disabled={!selectedVideo} 
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
        </button>
        <button
          className={`w-10 h-10 flex items-center justify-center rounded-lg ${activeTab === 'clips' && isContentVisible ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
          onClick={() => handleFarRightTabClick('clips')}
          title="Show Clips"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6A2.25 2.25 0 005.25 5.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 15l3-3m0 0l-3-3m3 3H9" />
          </svg>
        </button>
        <button
          className={`w-10 h-10 flex items-center justify-center rounded-lg ${activeTab === 'counters' && isContentVisible ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
          onClick={() => handleFarRightTabClick('counters')}
          title="Show Counters"
          disabled={!selectedVideo} 
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
          </svg>
        </button>
        <button
          className={`w-10 h-10 flex items-center justify-center rounded-lg ${activeTab === 'timers' && isContentVisible ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-800'}`}
          onClick={() => handleFarRightTabClick('timers')}
          title="Show Timers"
          disabled={!selectedVideo}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>

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
  );
};

export default AnalysisSidebar; 