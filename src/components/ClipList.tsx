'use client'
import { Fragment } from 'react'
import { ClipMarker } from '@/pages/coach/analyze-video' // Assuming types can be imported or are defined
import { useTheme } from '@/contexts/ThemeContext'

export interface ClipListProps {
  clipMarkers: ClipMarker[];
  loadingClips: boolean;
  currentTime: number;
  formatTime: (seconds: number) => string;
  onPlayClip: (clip: ClipMarker) => void;
}

const ClipList: React.FC<ClipListProps> = ({
  clipMarkers,
  loadingClips,
  currentTime,
  formatTime,
  onPlayClip,
}) => {
  const { isDarkMode } = useTheme(); // Using useTheme internally

  if (loadingClips) {
    return <div className="p-4 text-gray-400">Loading clips...</div>;
  }

  if (clipMarkers.length === 0) {
    return <div className="p-4 text-gray-400">No clips created yet.</div>;
  }

  return (
    <Fragment>
      {[...clipMarkers]
        .sort((a, b) => b.startTime - a.startTime) // Already sorted in parent, but good to ensure if used elsewhere
        .map((clip, index) => {
          const isActive = currentTime >= clip.startTime && currentTime < clip.endTime;
          return (
            <div 
              key={clip.id || index} 
              className={`p-4 border-b hover:bg-gray-800 cursor-pointer 
                          ${isDarkMode ? 'border-gray-800' : 'border-gray-300'} 
                          ${isActive ? (isDarkMode ? 'bg-green-800 border-l-4 border-green-400' : 'bg-green-200 border-l-4 border-green-500') : ''}`}
            >
              <div className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{clip.title}</div>
              <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {formatTime(clip.startTime)} - {formatTime(clip.endTime)} (Duration: {formatTime(clip.endTime - clip.startTime)})
              </div>
              {clip.labels && clip.labels.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {clip.labels.map(label => (
                    <span 
                      key={label} 
                      className={`px-2 py-0.5 text-xs rounded 
                                  ${isDarkMode ? 'bg-blue-900 text-blue-100' : 'bg-blue-200 text-blue-700'}`}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              )}
              {clip.comment && (
                <div className={`mt-2 p-2 rounded text-sm ${isDarkMode ? 'bg-gray-950 text-gray-200' : 'bg-gray-100 text-gray-700'}`}>{clip.comment}</div>
              )}
              <button
                onClick={() => onPlayClip(clip)}
                className={`mt-2 px-3 py-1 rounded text-xs 
                            ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
              >
                Play
              </button>
            </div>
          );
        })}
    </Fragment>
  );
};

export default ClipList; 