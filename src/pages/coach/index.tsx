'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { withAuth } from '@/components/auth'
import Link from 'next/link'

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
        <li><Link href="/coach/videos" className="text-blue-600 hover:underline">Manage Videos</Link></li>
        <li><Link href="/coach/analyze-video" className="text-blue-600 hover:underline">Analyze Videos & Create Clips</Link></li>
        <li><Link href="/coach/clips" className="text-blue-600 hover:underline">Edit Clips</Link></li>
        <li>Unreplied Comments: {unrepliedCount}</li>
      </ul>
    </div>
  )
}

// Restrict this page to coach or admin users
export default withAuth(
  CoachDashboard, 
  {
    teamId: 'any',
    roles: ['coach']
  }
)
