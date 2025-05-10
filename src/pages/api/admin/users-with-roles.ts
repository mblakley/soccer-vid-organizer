import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    console.log('Starting /api/admin/users-with-roles handler')
    
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
    
    // Fetch all users with roles from user_roles table
    console.log('Fetching user roles from database')
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('user_id, role')

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

    // Get user details for each user with a role
    console.log(`Getting user details for ${roleData.length} users`)
    const userPromises = roleData.map(async (role) => {
      try {
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(role.user_id)
        
        if (userError || !userData) {
          console.warn(`Could not fetch user ${role.user_id}:`, userError)
          return null
        }
        
        return {
          ...userData.user,
          role: role.role,
          user_metadata: {
            ...userData.user.user_metadata,
            assigned_role: role.role
          }
        }
      } catch (error) {
        console.error(`Error fetching user details for ${role.user_id}:`, error)
        return null
      }
    })
    
    console.log('Waiting for all user detail promises to resolve')
    const users = await Promise.all(userPromises)
    const validUsers = users.filter(user => user !== null)
    console.log(`Found ${validUsers.length} valid users out of ${roleData.length} roles`)
    
    return res.status(200).json(validUsers)
  } catch (error: any) {
    console.error('Error fetching users with roles:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
} 