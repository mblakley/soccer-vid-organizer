'use client'
import { useState } from 'react'
import { VideoPlayerControls } from '@/components/VideoPlayer'

interface ClipCreatorProps {
  isRecording: boolean;
  recordingStart: number | null;
  recordingElapsed: number;
  clipDuration: number;
  recentLabels: string[];
  isSavingClip: boolean;
  formatTime: (seconds: number) => string;
  isDarkMode: boolean;
  playerRef: React.RefObject<VideoPlayerControls | null>;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onSaveClip: (clipData: { title: string; comment: string; labels: string[] }) => Promise<void>;
  onCancelClipCreation: () => void;
}

const ClipCreator: React.FC<ClipCreatorProps> = ({
  isRecording,
  recordingStart,
  recordingElapsed,
  clipDuration,
  recentLabels,
  isSavingClip,
  formatTime,
  isDarkMode,
  playerRef,
  onStartRecording,
  onStopRecording,
  onSaveClip,
  onCancelClipCreation,
}) => {
  // Internal state for the clip creation form
  const [clipTitle, setClipTitle] = useState('');
  const [clipComment, setClipComment] = useState('');
  const [clipLabels, setClipLabels] = useState<string[]>([]);
  const [newLabel, setNewLabel] = useState('');

  const handleSaveClip = async () => {
    await onSaveClip({
      title: clipTitle.trim(),
      comment: clipComment.trim(),
      labels: [...clipLabels],
    });
    
    // Reset form state
    setClipTitle('');
    setClipComment('');
    setClipLabels([]);
    setNewLabel('');
  };

  const handleCancelClipCreation = () => {
    onCancelClipCreation();
    
    // Reset form state
    setClipTitle('');
    setClipComment('');
    setClipLabels([]);
    setNewLabel('');
  };

  const addLabel = (label: string) => {
    if (!label.trim()) return;
    if (!clipLabels.includes(label.trim())) {
      setClipLabels([...clipLabels, label.trim()]);
    }
    setNewLabel('');
  };

  const removeLabel = (label: string) => {
    setClipLabels(clipLabels.filter(l => l !== label));
  };

  if (!isRecording && recordingStart === null) {
    return (
      <div className="flex flex-col items-center justify-center p-6">
        <button
          onClick={onStartRecording}
          className={`px-6 py-3 rounded-full font-medium text-lg transition-colors ${
            isDarkMode 
              ? 'bg-red-700 hover:bg-red-600 text-white' 
              : 'bg-red-600 hover:bg-red-500 text-white'
          }`}
          disabled={!playerRef.current}
        >
          Start Clip
        </button>
      </div>
    );
  }

  if (isRecording) {
    return (
      <div className="flex flex-col items-center justify-center p-6">
        <div className="flex items-center mb-4">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse mr-2"></div>
          <span>Recording from {recordingStart !== null ? formatTime(recordingStart) : '0:00'}</span>
          <span className="ml-4 text-sm font-mono text-blue-400">{formatTime(recordingElapsed)}</span>
        </div>
        <button
          onClick={onStopRecording}
          className={`px-6 py-3 rounded-full font-medium text-lg transition-colors ${
            isDarkMode 
              ? 'bg-gray-700 hover:bg-gray-600 text-white' 
              : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
          }`}
        >
          End Clip
        </button>
      </div>
    );
  }

  return (
    <div className={`p-3 rounded border ${
      isDarkMode 
        ? 'bg-gray-800 border-gray-700' 
        : 'bg-gray-50 border-gray-300'
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
        {clipDuration > 0 && (
          <div className={`text-sm ${
            isDarkMode 
              ? 'text-gray-300' 
              : 'text-gray-600'
          }`}>
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
          <div className="mb-2">
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addLabel(newLabel)}
              className={`w-full border rounded px-3 py-2 ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300'
              }`}
              placeholder="Add labels (e.g., attack, defense, player name)"
            />
            <button
              onClick={() => addLabel(newLabel)}
              className={`mt-2 w-full px-3 py-2 rounded transition-colors ${
                isDarkMode 
                  ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
              }`}
            >
              Add
            </button>
          </div>
          {recentLabels.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {recentLabels.slice(0, 10).map(label => (
                <button
                  key={label}
                  onClick={() => addLabel(label)}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    clipLabels.includes(label) 
                      ? isDarkMode 
                        ? 'bg-blue-800 text-white' 
                        : 'bg-blue-200 text-blue-800' 
                      : isDarkMode 
                        ? 'bg-gray-700 text-gray-300' 
                        : 'bg-gray-200 text-gray-800'
                  } hover:opacity-80`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          {clipLabels.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {clipLabels.map(label => (
                <div 
                  key={label} 
                  className={`flex items-center space-x-1 px-2 py-1 rounded text-sm ${
                    isDarkMode 
                      ? 'bg-blue-900 text-blue-100' 
                      : 'bg-blue-100 text-blue-800'
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
            onClick={handleCancelClipCreation}
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
  );
};

export default ClipCreator; 