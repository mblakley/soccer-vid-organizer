import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get the session from the request
    const authHeader = req.headers.authorization
    if (!authHeader) {
      return res.status(401).json({ message: 'No authorization header' })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      console.error('Auth error:', authError)
      return res.status(401).json({ message: 'Invalid session' })
    }

    // Check if the current user is an admin
    const { data: currentUserRole, error: roleError } = await supabase
      .from('user_roles')
      .select('is_admin')
      .eq('user_id', user.id)
      .single()

    if (roleError) {
      console.error('Error fetching current user role:', roleError)
      return res.status(500).json({ message: 'Error checking admin status' })
    }

    if (!currentUserRole?.is_admin) {
      console.error('User is not an admin:', user.id)
      return res.status(403).json({ message: 'Forbidden: Admin access required' })
    }

    const { id, isAdmin } = req.body
    console.log('Updating user role:', { id, isAdmin })

    if (!id || typeof isAdmin !== 'boolean') {
      console.error('Invalid request parameters:', { id, isAdmin })
      return res.status(400).json({ message: 'Invalid request parameters' })
    }

    // Update the user_roles table
    const { error: updateError } = await supabase
      .from('user_roles')
      .update({ is_admin: isAdmin })
      .eq('user_id', id)

    if (updateError) {
      console.error('Error updating user role:', updateError)
      return res.status(500).json({ 
        message: 'Failed to update user role',
        error: updateError.message,
        details: updateError
      })
    }

    return res.status(200).json({ message: 'User role updated successfully' })
  } catch (error: any) {
    console.error('Error in update-user-role:', error)
    return res.status(500).json({ 
      message: error.message || 'Internal server error',
      error: error.toString(),
      stack: error.stack
    })
  }
}