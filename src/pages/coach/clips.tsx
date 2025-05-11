'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import withAuth from '@/components/withAuth'
import { useTheme } from '@/contexts/ThemeContext'

function CoachClipManager({ user }: { user: any }) {
  const [clips, setClips] = useState<any[]>([])
  const [videos, setVideos] = useState<any[]>([])
  const [title, setTitle] = useState('')
  const [videoId, setVideoId] = useState('')
  const [selectedVideo, setSelectedVideo] = useState('')
  const [start, setStart] = useState(0)
  const [end, setEnd] = useState(0)
  const [editId, setEditId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [videosLoading, setVideosLoading] = useState(true)
  const { isDarkMode } = useTheme()

  useEffect(() => {
    // Load clips as soon as the component mounts
    const fetchClips = async () => {
      try {
        console.log('Fetching clips')
        const { data, error } = await supabase.from('clips').select('*')
        
        if (error) {
          console.error('Error fetching clips:', error)
        } else {
          console.log(`Fetched ${data?.length || 0} clips`)
          setClips(data || [])
        }
      } catch (err) {
        console.error('Exception fetching clips:', err)
      } finally {
        setLoading(false)
      }
    }
    
    const fetchVideos = async () => {
      try {
        const { data, error } = await supabase
          .from('videos')
          .select('id, title, video_id, source')
          .order('title')
        
        if (error) {
          console.error('Error fetching videos:', error)
        } else {
          setVideos(data || [])
        }
      } catch (err) {
        console.error('Exception fetching videos:', err)
      } finally {
        setVideosLoading(false)
      }
    }
    
    fetchClips()
    fetchVideos()
  }, []) // Only run once on mount

  const refreshClips = async () => {
    try {
      const { data, error } = await supabase.from('clips').select('*')
      if (error) {
        console.error('Error refreshing clips:', error)
      } else {
        setClips(data || [])
      }
    } catch (err) {
      console.error('Exception refreshing clips:', err)
    }
  }

  const handleAddOrUpdateClip = async () => {
    try {
      // Use selected video's video_id if available, otherwise use direct videoId input
      const clipVideoId = selectedVideo ? 
        videos.find(v => v.id === selectedVideo)?.video_id : 
        videoId
      
      if (!clipVideoId) {
        alert('Please select a video or enter a video ID')
        return
      }
      
      if (editId) {
        await supabase.from('clips').update({
          title,
          video_id: clipVideoId,
          start_time: start,
          end_time: end,
        }).eq('id', editId)
      } else {
        await supabase.from('clips').insert({
          title,
          video_id: clipVideoId,
          start_time: start,
          end_time: end,
          created_by: user.id // Add the user ID as the creator
        })
      }
      setTitle('')
      setVideoId('')
      setSelectedVideo('')
      setStart(0)
      setEnd(0)
      setEditId(null)
      refreshClips()
    } catch (error) {
      console.error('Error adding/updating clip:', error)
      alert('Failed to save clip. Please try again.')
    }
  }

  const handleEdit = (clip: any) => {
    setEditId(clip.id)
    setTitle(clip.title)
    setVideoId(clip.video_id)
    // Try to find this video in our videos list
    const existingVideo = videos.find(v => v.video_id === clip.video_id)
    if (existingVideo) {
      setSelectedVideo(existingVideo.id)
    } else {
      setSelectedVideo('')
    }
    setStart(clip.start_time)
    setEnd(clip.end_time)
  }

  const handleDelete = async (id: string) => {
    try {
      await supabase.from('clips').delete().eq('id', id)
      refreshClips()
    } catch (error) {
      console.error('Error deleting clip:', error)
      alert('Failed to delete clip. Please try again.')
    }
  }

  return (
    <div className="p-8 space-y-4">
      <div className={`grid gap-2 max-w-md ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
        <input 
          className={`border px-4 py-2 rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} 
          placeholder="Title" 
          value={title} 
          onChange={e => setTitle(e.target.value)} 
        />
        
        {videosLoading ? (
          <div className="py-2">Loading videos...</div>
        ) : videos.length > 0 ? (
          <div>
            <label className="block mb-1">Select Video:</label>
            <select 
              className={`w-full px-4 py-2 border rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              value={selectedVideo}
              onChange={e => {
                setSelectedVideo(e.target.value)
                // Clear direct videoId input when selecting from library
                setVideoId('')
              }}
            >
              <option value="">-- Select Video --</option>
              {videos.map(video => (
                <option key={video.id} value={video.id}>
                  {video.title} {video.source !== 'youtube' ? `(${video.source})` : ''}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="py-2">
            <p>No videos in library. <a href="/coach/videos" className="text-blue-500 underline">Add videos first</a></p>
          </div>
        )}
        
        <div>
          <label className="block mb-1">Or enter YouTube Video ID directly:</label>
          <input 
            className={`w-full border px-4 py-2 rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} 
            placeholder="Video ID" 
            value={videoId} 
            onChange={e => {
              setVideoId(e.target.value)
              // Clear selected video when entering direct videoId
              setSelectedVideo('')
            }} 
          />
        </div>
        
        <input 
          type="number" 
          className={`border px-4 py-2 rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} 
          placeholder="Start Time (s)" 
          value={start} 
          onChange={e => setStart(Number(e.target.value))} 
        />
        <input 
          type="number" 
          className={`border px-4 py-2 rounded ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`} 
          placeholder="End Time (s)" 
          value={end} 
          onChange={e => setEnd(Number(e.target.value))} 
        />
        <div className="space-x-2">
          <button 
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded" 
            onClick={handleAddOrUpdateClip}
          >
            {editId ? 'Update' : 'Add'} Clip
          </button>
          {editId && (
            <button 
              className={`px-4 py-2 rounded ${isDarkMode ? 'bg-gray-600 text-white' : 'bg-gray-300 text-gray-800'}`} 
              onClick={() => { setEditId(null); setTitle(''); setVideoId(''); setSelectedVideo(''); setStart(0); setEnd(0); }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>
      
      <h2 className="text-xl font-semibold">Existing Clips</h2>
      {loading ? (
        <p>Loading clips...</p>
      ) : clips.length === 0 ? (
        <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>No clips found. Add your first clip above.</p>
      ) : (
        <ul className="space-y-2">
          {clips.map(c => (
            <li key={c.id} className={`flex justify-between items-center border-b pb-1 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <span>{c.title} – {c.video_id} [{c.start_time}-{c.end_time}s]</span>
              <span className="space-x-2">
                <button className={`${isDarkMode ? 'text-blue-400' : 'text-blue-600'} hover:underline`} onClick={() => handleEdit(c)}>Edit</button>
                <button className={`${isDarkMode ? 'text-red-400' : 'text-red-600'} hover:underline`} onClick={() => handleDelete(c.id)}>Delete</button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Only allow coach and admin roles to access this page
export default withAuth(CoachClipManager, ['coach', 'admin'], 'Manage Clips')
