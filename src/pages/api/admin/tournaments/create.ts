import { NextApiRequest, NextApiResponse } from 'next'
import { withApiAuth } from '@/lib/auth'
import { getSupabaseClient } from '@/lib/supabaseClient'

interface CreateTournamentResponse {
  tournament?: any;
  message?: string;
}

async function handler(req: NextApiRequest, res: NextApiResponse<CreateTournamentResponse>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST'])
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { name, startDate, endDate, location } = req.body

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ message: 'Tournament name is required' })
  }

  if (!startDate || !endDate) {
    return res.status(400).json({ message: 'Start date and end date are required' })
  }

  try {
    const supabase = await getSupabaseClient(req.headers.authorization)
    const { data, error } = await supabase
      .from('tournaments')
      .insert([{
        name,
        start_date: startDate,
        end_date: endDate,
        location: location || null
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating tournament:', error)
      return res.status(500).json({ message: error.message })
    }

    return res.status(201).json({ tournament: data })
  } catch (err: any) {
    console.error('Exception creating tournament:', err)
    return res.status(500).json({ message: err.message || 'An unexpected error occurred' })
  }
}

export default withApiAuth(handler, {
  allowUnauthenticated: false
}) 