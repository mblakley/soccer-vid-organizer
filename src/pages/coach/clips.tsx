'use client'
import { useEffect, useState, useCallback } from 'react'
import { withAuth, User } from '@/components/auth' // Ensure User is imported
import { useTheme } from '@/contexts/ThemeContext'
import { toast } from 'react-toastify'
import { apiClient } from '@/lib/api/client'
import { Clip, Video } from '@/lib/types' // Import Clip and Video types
import { PlusCircle, Edit, Trash2, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react'

interface CoachClipManagerProps { // Define props for type safety
  user: User;
}

interface ListVideosApiResponse { // For fetching videos
  videos?: Video[];
  message?: string;
}

interface ListClipsApiResponse { // For fetching clips
  clips?: Clip[];
  message?: string;
}

// Define structure for API responses from clip create/update/delete if they return the clip or a message
interface MutateClipResponse {
    clip?: Clip;
    message?: string;
}

function CoachClipManager({ user }: CoachClipManagerProps) {
  const [clips, setClips] = useState<Clip[]>([])
  const [videos, setVideos] = useState<Video[]>([])
  const [title, setTitle] = useState('')
  const [selectedVideoId, setSelectedVideoId] = useState<string>(''); // Stores the ID of the video from the videos table
  const [startTime, setStartTime] = useState<number>(0)
  const [endTime, setEndTime] = useState<number>(0)
  const [editClipId, setEditClipId] = useState<string | null>(null)
  
  const [clipsLoading, setClipsLoading] = useState(true)
  const [videosLoading, setVideosLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [actionError, setActionError] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const { isDarkMode } = useTheme()

  const fetchClips = useCallback(async () => {
    setFetchError(null);
    setClipsLoading(true);
    try {
      const response = await apiClient.get<ListClipsApiResponse>('/api/clips/list'); // Use the generic list endpoint
      if (response?.clips) {
        setClips(response.clips);
      } else {
        setClips([]);
        if (response?.message) setFetchError(response.message); 
      }
    } catch (err: any) {
      console.error('Exception fetching clips:', err);
      setFetchError(err.message || 'An unexpected error occurred while fetching clips.');
      setClips([]);
    } finally {
      setClipsLoading(false);
    }
  }, []);
  
  const fetchVideos = useCallback(async () => {
    setVideosLoading(true);
    try {
      // Fetch specific fields and order by title
      const response = await apiClient.get<ListVideosApiResponse>('/api/videos/list?select=id,title,video_id,source&orderBy=title&orderAscending=true');
      if (response?.videos) {
        setVideos(response.videos);
      } else {
        setVideos([]);
        // Optionally set an error if needed, or rely on UI to show "no videos"
      }
    } catch (err: any) {
      console.error('Exception fetching videos:', err);
      // Optionally set an error state for videos list
      setVideos([]);
    } finally {
      setVideosLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClips();
    fetchVideos();
  }, [fetchClips, fetchVideos]);

  const resetForm = () => {
    setTitle('');
    setSelectedVideoId('');
    setStartTime(0);
    setEndTime(0);
    setEditClipId(null);
    setActionError(null);
  };

  const handleAddOrUpdateClip = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setIsSubmitting(true);

    if (!selectedVideoId) {
      setActionError('Please select a video from the list.');
      setIsSubmitting(false);
      return;
    }
    if (endTime <= startTime) {
        setActionError('End time must be after start time.');
        setIsSubmitting(false);
        return;
    }

    const videoDetails = videos.find(v => v.id === selectedVideoId);
    if (!videoDetails || !videoDetails.video_id) { // video_id from the source (e.g. YouTube ID)
        setActionError('Selected video details are incomplete. Cannot create clip.');
        setIsSubmitting(false);
        return;
    }

    const clipData = {
      title: title || `Clip from ${videoDetails.title || 'video'}`,
      video_id: videoDetails.video_id, // This is the actual ID of the video (e.g. YouTube video ID)
      // video_table_id: videoDetails.id, // Optionally, if your API/DB needs the PK of the 'videos' table
      start_time: startTime,
      end_time: endTime,
      created_by: user.id,
    };

    try {
      let response: MutateClipResponse | undefined;
      if (editClipId) {
        response = await apiClient.put<MutateClipResponse>(`/api/clips/${editClipId}`, clipData); // Assuming PUT for update
        toast.success(response?.message || 'Clip updated successfully!');
      } else {
        response = await apiClient.post<MutateClipResponse>('/api/clips/create', clipData);
        toast.success(response?.message || 'Clip added successfully!');
      }
      resetForm();
      fetchClips(); // Refresh the clips list
    } catch (error: any) {
      console.error('Error adding/updating clip:', error);
      const apiErrorMessage = error.response?.data?.message || error.message;
      setActionError(apiErrorMessage || 'Failed to save clip. Please try again.');
      toast.error(apiErrorMessage || 'Failed to save clip.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (clip: Clip) => {
    setActionError(null);
    setEditClipId(clip.id);
    setTitle(clip.title || '');
    
    // Find the video in the local videos list that corresponds to the clip's video_id (source video ID)
    const videoForClip = videos.find(v => v.video_id === clip.video_id);
    setSelectedVideoId(videoForClip?.id || ''); // Set the PK of the video in the select dropdown
    
    setStartTime(clip.start_time);
    setEndTime(clip.end_time);
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to form for editing
  };

  const handleDelete = async (id: string) => {
    setActionError(null);
    if (!confirm("Are you sure you want to delete this clip?")) return;
    setIsSubmitting(true); // Indicate loading state for delete
    try {
      const response = await apiClient.delete<MutateClipResponse>(`/api/clips/${id}`); // Assuming DELETE request
      toast.success(response?.message || 'Clip deleted successfully!');
      fetchClips(); // Refresh list
      if (editClipId === id) resetForm(); // If deleting the clip currently being edited, reset form
    } catch (error: any) {
      console.error('Error deleting clip:', error);
      const apiErrorMessage = error.response?.data?.message || error.message;
      setActionError(apiErrorMessage || 'Failed to delete clip. Please try again.');
      toast.error(apiErrorMessage || 'Failed to delete clip.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const inputClasses = `w-full border px-3 py-2 rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'} focus:ring-blue-500 focus:border-blue-500`;
  const labelClasses = `block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`;
  const buttonClasses = (color: string) => `px-4 py-2 rounded-md font-medium text-white transition-colors disabled:opacity-50 flex items-center justify-center ${isSubmitting ? 'cursor-not-allowed' : ''}`;

  return (
    <div className={`p-4 md:p-8 space-y-6 ${isDarkMode ? 'bg-gray-800 text-gray-100' : 'bg-gray-100 text-gray-800'}`}>
      <h1 className="text-3xl font-bold">Manage Clips</h1>

      <form onSubmit={handleAddOrUpdateClip} className={`p-6 rounded-lg shadow-md space-y-4 ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}>
        <h2 className="text-xl font-semibold">{editClipId ? 'Edit Clip' : 'Add New Clip'}</h2>
        {actionError && (
          <div className={`p-3 border rounded text-sm ${isDarkMode ? 'bg-red-800 border-red-600 text-red-200' : 'bg-red-100 border-red-300 text-red-700'}`} role="alert">
            <AlertTriangle size={18} className="inline mr-2" />{actionError}
          </div>
        )}
        <div>
          <label htmlFor="clipTitle" className={labelClasses}>Clip Title (Optional)</label>
          <input id="clipTitle" className={inputClasses} placeholder="E.g., Great Goal, Defensive Error" value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        
        <div>
          <label htmlFor="videoSelect" className={labelClasses}>Select Video <span className="text-red-500">*</span></label>
          {videosLoading ? (
            <div className="flex items-center text-sm"><Loader2 size={16} className="animate-spin mr-2" />Loading videos...</div>
          ) : videos.length > 0 ? (
            <select 
              id="videoSelect"
              className={inputClasses}
              value={selectedVideoId}
              onChange={e => setSelectedVideoId(e.target.value)}
              required
            >
              <option value="">-- Select a Video --</option>
              {videos.map(video => (
                <option key={video.id} value={video.id}>
                  {video.title} {video.source && video.source !== 'youtube' && video.source !== 'upload' ? `(${video.source})` : ''}
                </option>
              ))}
            </select>
          ) : (
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>No videos found in library. <a href="/coach/videos" className="underline">Add videos</a> to create clips.</p>
          )}
        </div>
                
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="startTime" className={labelClasses}>Start Time (seconds) <span className="text-red-500">*</span></label>
            <input id="startTime" type="number" className={inputClasses} placeholder="0" value={startTime} onChange={e => setStartTime(Number(e.target.value))} required />
          </div>
          <div>
            <label htmlFor="endTime" className={labelClasses}>End Time (seconds) <span className="text-red-500">*</span></label>
            <input id="endTime" type="number" className={inputClasses} placeholder="10" value={endTime} onChange={e => setEndTime(Number(e.target.value))} required />
          </div>
        </div>

        <div className="flex items-center space-x-3 pt-2">
          <button 
            type="submit"
            className={`${buttonClasses('green')} ${isDarkMode ? 'bg-green-600 hover:bg-green-500' : 'bg-green-500 hover:bg-green-600'}`}
            disabled={isSubmitting || videosLoading || (videos.length === 0 && !selectedVideoId)}
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin mr-2"/> : (editClipId ? <Edit size={18} className="mr-2"/> : <PlusCircle size={18} className="mr-2"/>)}
            {editClipId ? 'Update Clip' : 'Add Clip'}
          </button>
          {editClipId && (
            <button 
              type="button"
              className={`${buttonClasses('gray')} ${isDarkMode ? 'bg-gray-500 hover:bg-gray-400' : 'bg-gray-400 hover:bg-gray-500'}`}
              onClick={resetForm}
              disabled={isSubmitting}
            >
              Cancel Edit
            </button>
          )}
        </div>
      </form>

      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Existing Clips</h2>
          <button onClick={fetchClips} disabled={clipsLoading || isSubmitting} className={`p-2 rounded-md ${isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`} title="Refresh Clips">
            {clipsLoading ? <Loader2 size={20} className="animate-spin" /> : <RefreshCw size={20} />}
          </button>
        </div>
        {fetchError && (
           <div className={`p-3 mb-4 border rounded text-sm ${isDarkMode ? 'bg-red-800 border-red-600 text-red-200' : 'bg-red-100 border-red-300 text-red-700'}`} role="alert">
            <AlertTriangle size={18} className="inline mr-2" />{fetchError}
          </div>
        )}
        {clipsLoading ? (
          <div className="text-center py-6"><Loader2 size={24} className="animate-spin mx-auto" /> <p className="mt-2 text-sm">Loading clips...</p></div>
        ) : clips.length === 0 && !fetchError ? (
          <p className={`text-center py-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>No clips created yet. Use the form above to add your first clip.</p>
        ) : (
          <div className="space-y-3">
            {clips.map(clip => (
              <div key={clip.id} className={`p-4 rounded-lg shadow ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}>
                <div className="flex flex-col sm:flex-row justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold">{clip.title || 'Untitled Clip'}</h3>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Video ID: {clip.video_id} (Source)</p>
                    <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Duration: {clip.start_time}s - {clip.end_time}s</p>
                     {clip.videos?.title && <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Video Title: {clip.videos.title}</p>}
                  </div>
                  <div className="flex space-x-2 mt-3 sm:mt-0 flex-shrink-0">
                    <button onClick={() => handleEdit(clip)} className={`p-2 rounded-md hover:bg-opacity-80 ${isDarkMode ? 'bg-yellow-500 text-gray-900' : 'bg-yellow-400 text-gray-800'}`} title="Edit Clip" disabled={isSubmitting}><Edit size={16}/></button>
                    <button onClick={() => handleDelete(clip.id)} className={`p-2 rounded-md hover:bg-opacity-80 ${isDarkMode ? 'bg-red-600 text-white' : 'bg-red-500 text-white'}`} title="Delete Clip" disabled={isSubmitting}><Trash2 size={16}/></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default withAuth(
  CoachClipManager, 
  {
    teamId: 'any',
    roles: ['coach'],
    requireRole: true,
  },
  'CoachClipManager'
);
