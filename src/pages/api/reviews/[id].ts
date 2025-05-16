import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { id } = req.query
    if (!id || typeof id !== 'string') {
      console.error('Invalid session ID:', id)
      return res.status(400).json({ error: 'Invalid session ID' })
    }

    // Get the authorization header
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid authorization header')
      return res.status(401).json({ error: 'Missing or invalid authorization header' })
    }

    // Extract the token
    const token = authHeader.split(' ')[1]

    // Create a Supabase client with the user's token
    const supabaseClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      }
    )

    // Get the user info using the authenticated client
    const { data: userData, error: userError } = await supabaseClient.auth.getUser()
    
    if (userError || !userData.user) {
      console.error('Error getting user:', userError)
      return res.status(401).json({ error: 'Not authenticated' })
    }

    // Initialize Supabase client with admin privileges
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('Fetching session with ID:', id)

    // Fetch the session with its clips
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('film_review_sessions')
      .select(`
        *,
        clips:film_review_session_clips(
          id,
          clip_id,
          display_order,
          comment,
          clip:clips(
            id,
            title,
            video_id,
            start_time,
            end_time,
            created_by,
            created_at
          )
        )
      `)
      .eq('id', id)
      .single()

    if (sessionError) {
      console.error('Error fetching session:', sessionError)
      return res.status(500).json({ 
        error: 'Failed to fetch session',
        details: sessionError.message
      })
    }

    if (!session) {
      console.error('Session not found:', id)
      return res.status(404).json({ error: 'Session not found' })
    }

    // Sort clips by display_order
    if (session.clips) {
      session.clips.sort((a: any, b: any) => a.display_order - b.display_order)
    }

    console.log('Successfully fetched session:', {
      id: session.id,
      title: session.title,
      clipCount: session.clips?.length || 0
    })

    res.status(200).json(session)
  } catch (error: any) {
    console.error('Error in get review API:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
} 