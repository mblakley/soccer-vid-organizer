import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { email, password, metadata, display_name } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables')
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // Create user
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        ...metadata,
        full_name: display_name
      }
    })

    if (userError) {
      throw userError
    }

    res.status(201).json({ user })
  } catch (error: any) {
    console.error('Error creating user:', error)
    res.status(500).json({ error: error.message || 'Internal server error' })
  }
} 