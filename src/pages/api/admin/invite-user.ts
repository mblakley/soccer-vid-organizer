import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'
import { sendInvitationEmail } from '@/lib/emailClient'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, team_id, team_name } = req.body

  if (!email || !team_id || !team_name) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    // Generate a password reset link
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/login?team_id=${team_id}`
      }
    })

    if (error) {
      console.error('Error generating reset link:', error)
      return res.status(500).json({ error: 'Failed to generate reset link' })
    }

    // Send invitation email using nodemailer
    const result = await sendInvitationEmail(
      email,
      team_name,
      data.properties.action_link
    )

    return res.status(200).json({ 
      message: 'Invitation sent successfully',
      messageId: result.messageId
    })
  } catch (error: any) {
    console.error('Error:', error)
    return res.status(500).json({ error: error.message || 'An error occurred' })
  }
} 