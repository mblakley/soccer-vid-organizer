import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('Starting /api/admin/users-with-roles handler')
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }
    
    // Initialize Supabase client with admin privileges
    console.log('Initializing Supabase client')
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    
    // Fetch all users with admin status from user_roles table
    console.log('Fetching user roles from database')
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id, is_admin')

    console.log('Role data fetch result:', { 
      success: !roleError, 
      count: roleData?.length || 0,
      error: roleError ? roleError.message : null
    })

    if (roleError) {
      throw new Error(`Failed to fetch roles: ${roleError.message}`)
    }

    // If no users with roles, return empty array
    if (!roleData || roleData.length === 0) {
      console.log('No user roles found, returning empty array')
      return res.status(200).json([])
    }

    // Get all users from auth.users
    const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`)
    }

    // Combine user data with their admin status
    const usersWithRoles = users.users.map(user => {
      const userRole = roleData?.find(r => r.user_id === user.id)
      return {
        id: user.id,
        email: user.email,
        is_admin: userRole?.is_admin || false,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        user_metadata: user.user_metadata
      }
    })

    res.status(200).json(usersWithRoles)
  } catch (error: any) {
    console.error('Error in users-with-roles API:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 