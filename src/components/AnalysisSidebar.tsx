'use client'
import { Fragment, useState } from 'react'
import { Video } from '@/pages/coach/analyze-video' // Video is still exported from here
import { ClipMarker } from '@/types/clips'; // Corrected import path for ClipMarker
import { VideoPlayerControls } from '@/components/VideoPlayer'
import CountersSection from '@/components/counters/CountersSection'
import TimersSection from '@/components/timers/TimersSection'
import { useTheme } from '@/contexts/ThemeContext' // Import useTheme
import ClipList from '@/components/ClipList'; // Import the new ClipList component

// Re-define or import necessary types if not directly exportable from analyze-video
// For now, let's assume Video and ClipMarker can be imported or are defined here/globally.
// If not, we'll need to define them here based on their structure in analyze-video.tsx

export interface AnalysisSidebarProps {
  user: any; // Consider a more specific type
  videos: Video[];
  selectedVideo: Video | null;
  onVideoSelect: (videoId: string | null) => void;
  sidebarTab: 'clips' | 'counters' | 'createClip' | 'timers';
  // isDarkMode: boolean; // No longer needed if useTheme is used internally
  playerRef: React.RefObject<VideoPlayerControls | null>;
  currentTime: number;
  playerState: 'playing' | 'paused';
  onSeekToPlayer: (time: number) => void;
  
  clipMarkers: ClipMarker[];
  loadingClips: boolean;
  onPlayClip: (clip: ClipMarker) => void;
  
  isRecording: boolean;
  recordingStart: number | null;
  recordingElapsed: number;
  clipDuration: number;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onSaveClip: (clipData: {
    title: string;
    comment: string;
    labels: string[];
    // startTime and endTime will be derived from recordingStart and playerRef.current.getCurrentTime() when saving
  }) => Promise<void>; // startTime, endTime, videoId, source, createdBy will be handled by parent
  onCancelClipCreation: () => void;
  isSavingClip: boolean;
  recentLabels: string[];

  onShowConfirmModal: (config: { title: string; message: string; onConfirm: () => void; }) => void;
  onShowAddPlayerFormForCounters: (counterId: string, onConfirm: (playerName: string) => void) => void;
  onShowAddPlayerFormForTimers: (timerId: string) => void;
  
  formatTime: (seconds: number) => string;
  // Add any other props that were identified from analyze-video.tsx
  onSetSidebarTab: (tab: 'clips' | 'counters' | 'createClip' | 'timers') => void;
}

const AnalysisSidebar: React.FC<AnalysisSidebarProps> = ({
  user,
  videos,
  selectedVideo,
  onVideoSelect,
  sidebarTab,
  playerRef,
  currentTime,
  playerState,
  onSeekToPlayer,
  clipMarkers,
  loadingClips,
  onPlayClip,
  isRecording,
  recordingStart,
  recordingElapsed,
  clipDuration,
  onStartRecording,
  onStopRecording,
  onSaveClip,
  onCancelClipCreation,
  isSavingClip,
  recentLabels,
  onShowConfirmModal,
  onShowAddPlayerFormForCounters,
  onShowAddPlayerFormForTimers,
  formatTime,
  onSetSidebarTab,
}) => {
  const { isDarkMode } = useTheme(); // Get isDarkMode from context

  // Internal state for the clip creation form
  const [clipTitle, setClipTitle] = useState('');
  const [clipComment, setClipComment] = useState('');
  const [clipLabels, setClipLabels] = useState<string[]>([]);
  const [newLabel, setNewLabel] = useState('');

  const handleInternalSaveClip = async () => {
    // No need to check for selectedVideo or recordingStart here, parent should handle logic
    // Parent's onSaveClip will use playerRef.current.getCurrentTime() for endTime
    // and selectedVideo.id, selectedVideo.source, user.id for other details.
    await onSaveClip({ 
        title: clipTitle.trim(), 
        comment: clipComment.trim(), 
        labels: [...clipLabels] 
    });
    // Reset internal form state after successful save (or parent can trigger reset via props if needed)
    setClipTitle('');
    setClipComment('');
    setClipLabels([]);
    setNewLabel('');
  };

  const internalAddLabel = (label: string) => {
    if (!label.trim()) return;
    if (!clipLabels.includes(label.trim())) {
      setClipLabels([...clipLabels, label.trim()]);
    }
    setNewLabel('');
  };

  const internalRemoveLabel = (label: string) => {
    setClipLabels(clipLabels.filter(l => l !== label));
  };

  const handleInternalCancelClipCreation = () => {
    onCancelClipCreation(); // Call the prop
    // Reset internal form state
    setClipTitle('');
    setClipComment('');
    setClipLabels([]);
    setNewLabel('');
  };

  return (
    <div className="w-[350px] bg-gray-900 text-white flex flex-col border-l border-gray-800 overflow-y-auto h-full">
      {/* Video selection dropdown at the top */}
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
      <div className="p-4 border-b border-gray-800 font-bold text-lg flex items-center">
        {sidebarTab === 'clips' ? 'Clips' : sidebarTab === 'counters' ? 'Counters' : sidebarTab === 'timers' ? 'Timers' : 'Create Clip'}
      </div>
      <div className="flex-1 overflow-y-auto">
        {sidebarTab === 'clips' ? (
          <Fragment>
            <ClipList 
              clipMarkers={clipMarkers}
              loadingClips={loadingClips}
              currentTime={currentTime}
              formatTime={formatTime}
              onPlayClip={onPlayClip}
            />
          </Fragment>
        ) : sidebarTab === 'counters' ? (
          <Fragment>
            <CountersSection
              userId={user?.id}
              videoId={selectedVideo?.id}
              formatTime={formatTime}
              onShowConfirmModal={onShowConfirmModal}
              onShowAddPlayerForm={onShowAddPlayerFormForCounters}
              currentTime={currentTime}
              playerState={playerState}
              onSeekTo={onSeekToPlayer}
            />
          </Fragment>
        ) : sidebarTab === 'timers' ? (
          <Fragment>
            <TimersSection 
              userId={user?.id}
              videoId={selectedVideo?.id}
              formatTime={formatTime}
              onShowConfirmModal={onShowConfirmModal}
              onShowAddPlayerForm={onShowAddPlayerFormForTimers}
            />
          </Fragment>
        ) : ( // 'createClip' tab
          <Fragment>
            {!isRecording && recordingStart === null && (
              <div className="flex flex-col items-center justify-center p-6">
                <button
                  onClick={onStartRecording}
                  className={`px-6 py-3 rounded-full font-medium text-lg transition-colors ${isDarkMode ? 'bg-red-700 hover:bg-red-600 text-white' : 'bg-red-600 hover:bg-red-500 text-white'}`}
                  disabled={!selectedVideo || !playerRef.current} // Disable if no video/player
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
                  onClick={onStopRecording}
                  className={`px-6 py-3 rounded-full font-medium text-lg transition-colors ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
                >
                  End Clip
                </button>
              </div>
            )}
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
                        onKeyDown={(e) => e.key === 'Enter' && internalAddLabel(newLabel)} // Use internalAddLabel
                        className={`w-full border rounded px-3 py-2 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
                        placeholder="Add labels (e.g., attack, defense, player name)"
                      />
                      <button
                        onClick={() => internalAddLabel(newLabel)} // Use internalAddLabel
                        className={`mt-2 w-full px-3 py-2 rounded transition-colors ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
                      >Add</button>
                    </div>
                    {recentLabels.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-2">
                            {recentLabels.slice(0, 10).map(label => (
                            <button
                                key={label}
                                onClick={() => internalAddLabel(label)} // Use internalAddLabel
                                className={`text-xs px-2 py-1 rounded transition-colors ${clipLabels.includes(label) ? isDarkMode ? 'bg-blue-800 text-white' : 'bg-blue-200 text-blue-800' : isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-800'} hover:opacity-80`}
                            >{label}</button>
                            ))}
                        </div>
                    )}
                    {clipLabels.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {clipLabels.map(label => (
                          <div key={label} className={`flex items-center space-x-1 px-2 py-1 rounded text-sm ${isDarkMode ? 'bg-blue-900 text-blue-100' : 'bg-blue-100 text-blue-800'}`}>
                            <span>{label}</span>
                            <button onClick={() => internalRemoveLabel(label)} className="hover:text-red-500">×</button> {/* Use internalRemoveLabel */}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={handleInternalSaveClip} // Use handleInternalSaveClip
                      disabled={isSavingClip}
                      className={`px-4 py-2 rounded font-medium transition-colors ${isDarkMode ? 'bg-blue-700 hover:bg-blue-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'} ${isSavingClip ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >{isSavingClip ? 'Saving...' : 'Save Clip'}</button>
                    <button
                      onClick={() => {
                        // onSetSidebarTab('clips'); // Parent should handle this based on onCancelClipCreation
                        handleInternalCancelClipCreation(); // Use handleInternalCancelClipCreation
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
  );
};

export default AnalysisSidebar; 