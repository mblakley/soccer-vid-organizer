import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id, newRole } = req.body

    if (!id || !newRole) {
      return res.status(400).json({ error: 'Missing required parameters' })
    }
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }
    
    // Initialize Supabase client with admin privileges
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Update user metadata in auth.users
    const authResponse = await fetch(`${supabaseUrl}/auth/v1/admin/users/${id}`, {
      method: 'PUT',
      headers: {
        apiKey: supabaseServiceKey,
        Authorization: `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_metadata: { role: newRole }
      })
    })

    if (!authResponse.ok) {
      const errorText = await authResponse.text()
      throw new Error(`Auth update failed: ${authResponse.statusText} - ${errorText}`)
    }

    // Also update the user_roles table
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .upsert(
        { user_id: id, role: newRole },
        { onConflict: 'user_id' }
      )

    if (roleError) {
      throw new Error(`Role table update failed: ${roleError.message}`)
    }

    // Get the updated user
    const result = await authResponse.json()
    res.status(200).json(result)
  } catch (error: any) {
    console.error('Error updating user role:', error)
    res.status(500).json({ error: error.message || 'Failed to update user role' })
  }
}