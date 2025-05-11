import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const { userId } = req.body
  if (!userId) return res.status(400).json({ error: 'Missing userId' })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Missing Supabase environment variables' })
  }
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

  // Remove user from user_roles
  const { error: roleError } = await supabaseAdmin
    .from('user_roles')
    .delete()
    .eq('user_id', userId)
  if (roleError) {
    return res.status(500).json({ error: roleError.message })
  }

  // Remove user from Supabase Auth
  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (authError) {
    return res.status(500).json({ error: authError.message })
  }

  return res.status(200).json({ success: true })
} 