import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { getCurrentUser } from '@/lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
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

    const { title, description, tags, clips, team_id } = req.body

    if (!title || !team_id) {
      return res.status(400).json({ error: 'Title and team_id are required' })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    // Initialize Supabase client with admin privileges
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // First get the team member ID for the current user
    const { data: teamMember, error: teamMemberError } = await supabaseAdmin
      .from('team_members')
      .select('id')
      .eq('user_id', userData.user.id)
      .eq('team_id', team_id)
      .single()

    if (teamMemberError || !teamMember) {
      console.error('Error finding team member:', teamMemberError)
      return res.status(400).json({ error: 'User is not a member of this team' })
    }

    // Start a transaction to create the session and its clips
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('film_review_sessions')
      .insert({
        title,
        description,
        tags: tags || [],
        creator_team_member_id: teamMember.id,
        team_id,
        is_private: true // Default to private
      })
      .select()
      .single()

    if (sessionError) {
      console.error('Error creating session:', sessionError)
      return res.status(500).json({ error: 'Failed to create session' })
    }

    // If there are clips, insert them
    if (clips && clips.length > 0) {
      const sessionClips = clips.map((clip: any, index: number) => ({
        film_review_session_id: session.id,
        clip_id: clip.clip_id,
        display_order: index + 1,
        comment: clip.comment || null
      }))

      const { error: clipsError } = await supabaseAdmin
        .from('film_review_session_clips')
        .insert(sessionClips)

      if (clipsError) {
        console.error('Error creating session clips:', clipsError)
        // Note: We don't return here because the session was created successfully
        // We just log the error for the clips
      }
    }

    res.status(200).json(session)
  } catch (error: any) {
    console.error('Error in create review API:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
    })
  }
} 