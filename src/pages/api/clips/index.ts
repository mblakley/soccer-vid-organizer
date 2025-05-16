import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('Missing or invalid authorization header:', authHeader)
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

    // Get query parameters
    const { search, tags } = req.query
    const searchTerm = typeof search === 'string' ? search : undefined
    const tagArray = typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : undefined

    console.log('Fetching clips with params:', { searchTerm, tagArray })

    // Build the query
    let query = supabaseAdmin
      .from('clips')
      .select(`
        id,
        title,
        video_id,
        start_time,
        end_time,
        created_by,
        created_at
      `)
      .order('created_at', { ascending: false })

    // Add search filter if provided
    if (searchTerm) {
      query = query.ilike('title', `%${searchTerm}%`)
    }

    // Execute the query
    const { data: clips, error: clipsError } = await query

    if (clipsError) {
      console.error('Error fetching clips:', clipsError)
      return res.status(500).json({ 
        error: 'Failed to fetch clips',
        details: clipsError.message,
        code: clipsError.code
      })
    }

    console.log(`Successfully fetched ${clips?.length || 0} clips`)
    res.status(200).json(clips)
  } catch (error: any) {
    console.error('Error in get clips API:', error)
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
} 