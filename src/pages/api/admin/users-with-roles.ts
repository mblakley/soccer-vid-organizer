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
      .select('user_id, role, pending_review')

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

    // Group role data by user_id to handle multiple roles per user
    const userRoleMap = new Map()
    
    roleData.forEach(role => {
      if (!userRoleMap.has(role.user_id)) {
        userRoleMap.set(role.user_id, {
          activeRoles: [],
          pendingRoles: []
        })
      }
      
      const userRoles = userRoleMap.get(role.user_id)
      if (role.pending_review) {
        userRoles.pendingRoles.push(role.role)
      } else {
        userRoles.activeRoles.push(role.role)
      }
    })

    // Get user details for each user with a role
    console.log(`Getting user details for ${userRoleMap.size} users`)
    const userPromises = Array.from(userRoleMap.entries()).map(async ([userId, roleInfo]) => {
      try {
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId)
        
        if (userError || !userData) {
          console.warn(`Could not fetch user ${userId}:`, userError)
          return null
        }
        
        return {
          ...userData.user,
          roles: roleInfo.activeRoles,
          pending_roles: roleInfo.pendingRoles,
          user_metadata: {
            ...userData.user.user_metadata,
            assigned_role: roleInfo.activeRoles.join(', ') || 'None'
          }
        }
      } catch (error) {
        console.error(`Error fetching user details for ${userId}:`, error)
        return null
      }
    })
    
    console.log('Waiting for all user detail promises to resolve')
    const users = await Promise.all(userPromises)
    const validUsers = users.filter(user => user !== null)
    console.log(`Found ${validUsers.length} valid users out of ${userRoleMap.size} users with roles`)
    
    return res.status(200).json(validUsers)
  } catch (error: any) {
    console.error('Error fetching users with roles:', error)
    return res.status(500).json({ error: error.message || 'Internal server error' })
  }
} 