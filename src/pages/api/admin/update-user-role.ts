import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { id, isAdmin } = req.body

    if (!id || typeof isAdmin !== 'boolean') {
      return res.status(400).json({ error: 'Invalid request body' })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Update user metadata in auth.users
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      id,
      { user_metadata: { is_admin: isAdmin } }
    )

    if (updateError) {
      throw updateError
    }

    // Update or insert user_roles record
    const { error: upsertError } = await supabaseAdmin
      .from('user_roles')
      .upsert(
        { 
          user_id: id,
          is_admin: isAdmin
        },
        { 
          onConflict: 'user_id'
        }
      )

    if (upsertError) {
      throw upsertError
    }

    res.status(200).json({ success: true })
  } catch (error: any) {
    console.error('Error updating user role:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}