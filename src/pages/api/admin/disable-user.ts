import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  const { userId, ban } = req.body
  if (!userId || typeof ban !== 'boolean') return res.status(400).json({ error: 'Missing userId or ban' })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Missing Supabase environment variables' })
  }
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

  // Ban or unban the user
  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, { ban })
  if (error) {
    return res.status(500).json({ error: error.message })
  }
  return res.status(200).json({ success: true, user: data.user })
} 