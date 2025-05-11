import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('Starting /api/admin/pending-users handler')
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    console.log('Environment variables:', { 
      supabaseUrl: supabaseUrl ? 'set' : 'missing', 
      supabaseServiceKey: supabaseServiceKey ? 'set' : 'missing' 
    })
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }
    
    // Initialize Supabase client with admin privileges
    console.log('Initializing Supabase client')
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    
    // First, get all pending role requests
    console.log('Fetching pending role requests')
    const { data: pendingRoleData, error: pendingRoleError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id')
      .eq('pending_review', true)
      .order('id', { ascending: false })

    if (pendingRoleError) {
      throw new Error(`Failed to fetch pending roles: ${pendingRoleError.message}`)
    }

    // Extract unique user IDs from pending role requests
    const pendingUserIds = [...new Set(pendingRoleData.map(item => item.user_id))]
    console.log(`Found ${pendingUserIds.length} users with pending role requests`)

    if (pendingUserIds.length === 0) {
      return res.status(200).json([])
    }

    // Now fetch detailed user information for these users
    const userPromises = pendingUserIds.map(async (userId) => {
      try {
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId)
        
        if (userError || !userData) {
          console.warn(`Could not fetch user ${userId}:`, userError)
          return null
        }
        
        // Get pending roles for this user
        const { data: userRoles } = await supabaseAdmin
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .eq('pending_review', true)

        const pendingRoles = userRoles?.map(r => r.role) || []
        
        return {
          ...userData.user,
          pending_roles: pendingRoles
        }
      } catch (error) {
        console.error(`Error fetching user details for ${userId}:`, error)
        return null
      }
    })
    
    console.log('Waiting for all user detail promises to resolve')
    const users = (await Promise.all(userPromises)).filter(user => user !== null)
    console.log(`Found ${users.length} valid users with pending roles`)
    
    return res.status(200).json(users)
  } catch (error: any) {
    console.error('Error fetching pending users:', error)
    res.status(500).json({ error: error.message || 'Failed to fetch pending users' })
  }
}