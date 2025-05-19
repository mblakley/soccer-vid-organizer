import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId } = req.body

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' })
    }

    // Verify the user is authenticated and is requesting their own role
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
      return res.status(401).json({ error: 'Not authenticated' })
    }
    
    // Verify the user is requesting their own role
    if (userData.user.id !== userId) {
      return res.status(403).json({ error: 'You can only ensure your own user role' })
    }
    
    // Now use the admin client with service role to bypass RLS and constraints
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
    
    // First check if the user role already exists
    const { data: existingRole, error: checkError } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()
    
    if (checkError) {
      console.error('Error checking existing role:', checkError)
      return res.status(500).json({
        error: 'Failed to check existing role',
        details: checkError
      })
    }
    
    // If role already exists, return success
    if (existingRole) {
      return res.status(200).json({
        success: true,
        message: 'User role already exists',
        id: existingRole.id
      })
    }
    
    // Create the user role directly
    const { data: newRole, error: insertError } = await supabaseAdmin
      .from('user_roles')
      .insert([
        { user_id: userId, is_admin: false }
      ])
      .select()
      .single()
    
    if (insertError) {
      console.error('Error creating user role:', insertError)
      return res.status(500).json({
        error: 'Failed to create user role',
        details: insertError
      })
    }
    
    return res.status(200).json({
      success: true,
      message: 'User role created successfully',
      role: newRole
    })
  } catch (error: any) {
    console.error('Error in ensure-user-role API:', error)
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    })
  }
} 