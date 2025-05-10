'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import UserBanner from '@/components/UserBanner'
import withAuth from '@/components/withAuth'

function CoachClipManager({ user }: { user: any }) {
  const [clips, setClips] = useState<any[]>([])
  const [title, setTitle] = useState('')
  const [videoId, setVideoId] = useState('')
  const [start, setStart] = useState(0)
  const [end, setEnd] = useState(0)
  const [editId, setEditId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

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
    
    fetchClips()
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
      if (editId) {
        await supabase.from('clips').update({
          title,
          video_id: videoId,
          start_time: start,
          end_time: end,
        }).eq('id', editId)
      } else {
        await supabase.from('clips').insert({
          title,
          video_id: videoId,
          start_time: start,
          end_time: end,
          created_by: user.id // Add the user ID as the creator
        })
      }
      setTitle('')
      setVideoId('')
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
      <UserBanner email={user.email || ''} roles={user.roles || []} />
      <h1 className="text-2xl font-bold">Coach: Manage Clips</h1>
      <div className="grid gap-2 max-w-md">
        <input className="border px-4 py-2" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
        <input className="border px-4 py-2" placeholder="Video ID" value={videoId} onChange={e => setVideoId(e.target.value)} />
        <input type="number" className="border px-4 py-2" placeholder="Start Time (s)" value={start} onChange={e => setStart(Number(e.target.value))} />
        <input type="number" className="border px-4 py-2" placeholder="End Time (s)" value={end} onChange={e => setEnd(Number(e.target.value))} />
        <div className="space-x-2">
          <button className="bg-green-600 text-white px-4 py-2" onClick={handleAddOrUpdateClip}>{editId ? 'Update' : 'Add'} Clip</button>
          {editId && <button className="bg-gray-300 px-4 py-2" onClick={() => { setEditId(null); setTitle(''); setVideoId(''); setStart(0); setEnd(0); }}>Cancel</button>}
        </div>
      </div>
      
      <h2 className="text-xl font-semibold">Existing Clips</h2>
      {loading ? (
        <p>Loading clips...</p>
      ) : clips.length === 0 ? (
        <p className="text-gray-500">No clips found. Add your first clip above.</p>
      ) : (
        <ul className="space-y-2">
          {clips.map(c => (
            <li key={c.id} className="flex justify-between items-center border-b pb-1">
              <span>{c.title} – {c.video_id} [{c.start_time}-{c.end_time}s]</span>
              <span className="space-x-2">
                <button className="text-blue-600" onClick={() => handleEdit(c)}>Edit</button>
                <button className="text-red-600" onClick={() => handleDelete(c.id)}>Delete</button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Only allow coach and admin roles to access this page
export default withAuth(CoachClipManager, ['coach', 'admin'])
