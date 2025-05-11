import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { id, role } = req.body
    if (!id || !role) {
      return res.status(400).json({ error: 'Missing required parameters' })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Remove the role from the user_roles table
    const { error } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', id)
      .eq('role', role)

    if (error) {
      throw new Error(`Failed to remove role: ${error.message}`)
    }

    return res.status(200).json({ success: true })
  } catch (error: any) {
    console.error('Error removing user role:', error)
    return res.status(500).json({ error: error.message || 'Failed to remove user role' })
  }
} 