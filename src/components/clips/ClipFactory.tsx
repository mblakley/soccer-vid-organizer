import React from 'react';
// Assuming ClipMarker is exported from analyze-video or a shared types file.
// If this path is incorrect, it may need adjustment based on ClipMarker's actual location.
import { ClipMarker } from '@/types/clips';
import { Play } from 'lucide-react'; // Import Play icon

// --- Data Utility Functions (from original clipFactory.ts) ---
/**
 * Creates a ClipMarker object from raw data (e.g., from Supabase).
 * This can be expanded if more complex transformations are needed.
 */
export const createClipMarkerFromData = (data: any): ClipMarker => {
  // Assuming data has properties like id, start_time, end_time, title, etc.
  // And that comments and labels will be populated separately after initial fetch.
  return {
    id: data.id,
    startTime: data.start_time,
    endTime: data.end_time,
    title: data.title,
    comment: data.comment || '', // Initialize comment if not present
    labels: data.labels || [],   // Initialize labels if not present
  };
};

/**
 * Helper to format labels from a comment string (e.g., "LABELS: tag1, tag2")
 */
export const parseLabelsFromCommentString = (commentContent: string): string[] => {
  if (commentContent && commentContent.startsWith('LABELS:')) {
    const labelsText = commentContent.substring('LABELS:'.length).trim();
    return labelsText.split(',').map(l => l.trim()).filter(l => l);
  }
  return [];
};

/**
 * Helper to create the special labels comment string.
 */
export const createLabelsCommentString = (labels: string[]): string => {
  if (labels.length > 0) {
    return `LABELS: ${labels.join(', ')}`;
  }
  return '';
};
// --- End of Data Utility Functions ---


// --- ClipFactory Component ---
export interface ClipFactoryProps {
  clip: ClipMarker;
  onPlayClip: (clip: ClipMarker) => void;
  formatTime: (seconds: number) => string;
  // onEditClip?: (clip: ClipMarker) => void; // Future: For editing a clip
  // onDeleteClip?: (clipId: string) => void; // Future: For deleting a clip
  isSelected?: boolean;
  className?: string;
}

const ClipFactory: React.FC<ClipFactoryProps> = ({
  clip,
  onPlayClip,
  formatTime,
  isSelected = false,
  className = '',
  // onEditClip,
  // onDeleteClip,
}) => {
  const handlePlay = () => {
    onPlayClip(clip);
  };

  const duration = clip.endTime - clip.startTime;

  return (
    <div
      className={`p-3 mb-2 rounded-lg border transition-colors duration-150 ${
        isSelected 
          ? 'bg-blue-600 border-blue-500 text-white shadow-md' 
          : 'bg-gray-800 border-gray-700 hover:bg-gray-750 hover:border-gray-600'
      } ${className}`}
    >
      <div className="flex justify-between items-start mb-1">
        <div className="flex-grow min-w-0"> {/* Wrapper for truncation */}
          <h4 
            className={`font-semibold truncate ${isSelected ? 'text-white' : 'text-gray-100'}`}
            title={clip.title}
          >
            {clip.title}
          </h4>
        </div>
        <button
          onClick={handlePlay}
          className={`ml-2 flex-shrink-0 p-1 rounded focus:outline-none focus:ring-2 focus:ring-opacity-50 ${
            isSelected ? 'hover:bg-blue-500 focus:ring-blue-400' : 'hover:bg-gray-600 focus:ring-sky-500'
          }`}
          title="Play clip"
        >
          <Play size={20} className={isSelected ? 'text-white' : 'text-gray-200'} />
        </button>
      </div>
      <p className={`text-xs ${isSelected ? 'text-blue-200' : 'text-gray-400'} mb-2`}>
        {formatTime(clip.startTime)} - {formatTime(clip.endTime)} 
        <span className="ml-2">({formatTime(duration > 0 ? duration : 0)})</span>
      </p>
      {clip.labels && clip.labels.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {clip.labels.map(label => (
            <span
              key={label}
              className={`inline-block text-xs px-2 py-0.5 rounded-full ${
                isSelected ? 'bg-blue-500 text-white' : 'bg-gray-600 text-gray-200'
              }`}
            >
              {label}
            </span>
          ))}
        </div>
      )}
      {clip.comment && (
        <p className={`text-sm ${isSelected ? 'text-blue-100' : 'text-gray-300'} whitespace-pre-wrap text-ellipsis overflow-hidden max-h-24`}>
          {/* Consider a "read more" for long comments */}
          {clip.comment}
        </p>
      )}
      {/* Placeholder for future Edit/Delete buttons 
      <div className="mt-3 flex space-x-3 items-center justify-end">
        {onEditClip && (
          <button 
            onClick={() => onEditClip(clip)} 
            className={`text-xs font-medium ${isSelected ? 'text-blue-200 hover:text-white' : 'text-sky-400 hover:text-sky-300'}`}
          >
            Edit
          </button>
        )}
        {onDeleteClip && (
          <button 
            onClick={() => onDeleteClip(clip.id)} 
            className={`text-xs font-medium ${isSelected ? 'text-red-300 hover:text-white' : 'text-red-500 hover:text-red-400'}`}
          >
            Delete
          </button>
        )}
      </div>
      */}
    </div>
  );
};

export default ClipFactory; 