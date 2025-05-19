import { NextApiRequest, NextApiResponse } from 'next'
import { sendTeamNotificationEmail } from '@/lib/emailClient'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Check if POST request
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, team_name, roles, request_type } = req.body

  if (!email || !team_name || !roles) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

  try {
    // For now, we'll use the team notification email template
    // TODO: Create a specific rejection email template
    const result = await sendTeamNotificationEmail(email, team_name, '')
    return res.status(200).json({ message: 'Rejection notification sent successfully', messageId: result.messageId })
  } catch (error: any) {
    console.error('Error:', error)
    return res.status(500).json({ error: error.message || 'An error occurred' })
  }
} 