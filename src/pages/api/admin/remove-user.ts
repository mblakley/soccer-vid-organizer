import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { id } = req.body

    if (!id) {
      return res.status(400).json({ error: 'Invalid request body' })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Delete user from auth.users
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(id)

    if (deleteError) {
      throw deleteError
    }

    // Delete user's admin role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', id)

    if (roleError) {
      throw roleError
    }

    // Delete user's team memberships
    const { error: teamError } = await supabaseAdmin
      .from('team_members')
      .delete()
      .eq('user_id', id)

    if (teamError) {
      throw teamError
    }

    res.status(200).json({ success: true })
  } catch (error: any) {
    console.error('Error removing user:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
} 