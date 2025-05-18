import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    console.log('Starting /api/admin/check-user handler')
    
    const { email, teamId } = req.body
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }

    if (!teamId) {
      return res.status(400).json({ error: 'Team ID is required' })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }
    
    // Initialize Supabase client with admin privileges
    console.log('Initializing Supabase client')
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    
    // Check if user exists
    console.log('Checking for existing user:', email)
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers()
    
    if (error) {
      console.error('Error fetching users:', error)
      throw new Error(`Failed to fetch users: ${error.message}`)
    }

    const existingUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase())
    
    if (existingUser) {
      // Check if user is already a member of the team
      const { data: existingMember, error: memberError } = await supabaseAdmin
        .from('team_members')
        .select('id')
        .eq('team_id', teamId)
        .eq('user_id', existingUser.id)
        .eq('is_active', true)
        .single()

      if (memberError && memberError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
        console.error('Error checking team membership:', memberError)
        throw new Error(`Failed to check team membership: ${memberError.message}`)
      }

      if (existingMember) {
        return res.status(400).json({ 
          error: 'User is already a member of this team',
          exists: true,
          isTeamMember: true
        })
      }

      console.log('Found existing user:', existingUser.id)
      return res.json({
        exists: true,
        isTeamMember: false,
        user: {
          id: existingUser.id,
          email: existingUser.email,
          name: existingUser.user_metadata?.full_name || existingUser.email?.split('@')[0]
        }
      })
    }

    console.log('No existing user found')
    return res.json({ 
      exists: false,
      isTeamMember: false
    })
  } catch (error: any) {
    console.error('Error in check-user API:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
} 