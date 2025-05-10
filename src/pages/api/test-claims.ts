import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client with admin privileges
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { user_id } = req.query

    if (!user_id) {
      return res.status(400).json({ error: 'Missing user_id parameter' })
    }

    // Check if user exists
    const { data: userExists, error: userError } = await supabaseAdmin.auth.admin.getUserById(
      user_id as string
    )

    if (userError || !userExists) {
      return res.status(404).json({ error: 'User not found', details: userError })
    }

    // Add user to user_roles table with admin role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .upsert(
        { user_id: user_id, role: 'admin' },
        { onConflict: 'user_id' }
      )
      .select()

    if (roleError) {
      return res.status(500).json({ error: 'Failed to add role', details: roleError })
    }

    // Force refresh tokens to apply new claims
    const { error: refreshError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: userExists.user.email!,
    })

    if (refreshError) {
      return res.status(500).json({ 
        message: 'Role added but token refresh failed', 
        role: roleData,
        error: refreshError 
      })
    }

    return res.status(200).json({ 
      message: 'User role added and tokens refreshed',
      user: userExists.user,
      role: roleData
    })
  } catch (error) {
    console.error('Error in test-claims API:', error)
    return res.status(500).json({ error: 'Internal server error', details: error })
  }
} 