import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '@/lib/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    // Get the user from their session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !sessionData.session) {
      return res.status(401).json({ error: 'Not authenticated' })
    }
    
    // Get the user info
    const { data: userData, error: userError } = await supabase.auth.getUser()
    
    if (userError || !userData.user) {
      return res.status(401).json({ error: 'User not found' })
    }
    
    const { requestedRole } = req.body
    
    if (!requestedRole) {
      return res.status(400).json({ error: 'Missing requested role' })
    }
    
    // Validate the role is one of the allowed values
    const validRoles = ['admin', 'coach', 'player', 'parent']
    if (!validRoles.includes(requestedRole)) {
      return res.status(400).json({ error: 'Invalid role requested' })
    }
    
    // Insert the role request into the user_roles table
    // The unique constraint will prevent duplicate role requests
    const { data, error } = await supabase
      .from('user_roles')
      .upsert(
        { 
          user_id: userData.user.id,
          role: requestedRole,
          pending_review: true
        },
        { onConflict: 'user_id,role' }
      )
    
    if (error) {
      // If it's a duplicate, return a more helpful message
      if (error.code === '23505') { // Unique violation
        return res.status(409).json({ 
          error: 'You have already requested or been assigned this role' 
        })
      }
      
      console.error('Error requesting role:', error)
      return res.status(500).json({ error: 'Failed to request role' })
    }
    
    return res.status(200).json({ 
      success: true, 
      message: 'Role request submitted for approval' 
    })
  } catch (error: any) {
    console.error('Error in role request API:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
} 