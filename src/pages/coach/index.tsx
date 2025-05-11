'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import withAuth from '@/components/withAuth'

function CoachDashboard({ user }: { user: any }) {
  const [unrepliedCount, setUnrepliedCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUnrepliedComments = async () => {
      const { data } = await supabase
        .from('comments')
        .select('id', { count: 'exact' })
        .is('reply_to', null)
      setUnrepliedCount(data?.length || 0)
      setLoading(false)
    }
    fetchUnrepliedComments()
  }, [])

  if (loading) return <p className="p-8">Loading...</p>

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Coach Dashboard</h1>
      <ul className="list-disc list-inside space-y-2">
        <li><a href="/coach/videos" className="text-blue-600 underline">Manage Videos</a></li>
        <li><a href="/coach/clips" className="text-blue-600 underline">Edit Clips</a></li>
        <li>Unreplied Comments: {unrepliedCount}</li>
      </ul>
    </div>
  )
}

// Restrict this page to coach or admin users
export default withAuth(CoachDashboard, ['coach', 'admin'])
