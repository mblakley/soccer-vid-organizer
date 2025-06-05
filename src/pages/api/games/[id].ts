import { NextApiRequest, NextApiResponse } from 'next'
import { withApiAuth } from '@/lib/auth'
import { getSupabaseClient } from '@/lib/supabaseClient'

interface GameResponse {
  game?: any;
  message?: string;
  success?: boolean;
}

async function handler(req: NextApiRequest, res: NextApiResponse<GameResponse>) {
  if (req.method !== 'GET' && req.method !== 'DELETE') {
    res.setHeader('Allow', ['GET', 'DELETE'])
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'Game ID is required' })
  }

  try {
    const supabase = await getSupabaseClient(req.headers.authorization)

    if (req.method === 'DELETE') {
      const { error } = await supabase
        .from('games')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting game:', error)
        return res.status(500).json({ message: error.message })
      }

      return res.status(200).json({ success: true })
    }

    // GET request
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching game:', error)
      return res.status(500).json({ message: error.message })
    }

    if (!data) {
      return res.status(404).json({ message: 'Game not found' })
    }

    return res.status(200).json({ game: data })
  } catch (err: any) {
    console.error('Exception handling game:', err)
    return res.status(500).json({ message: err.message || 'An unexpected error occurred' })
  }
}

export default withApiAuth(handler, {
  allowUnauthenticated: false
}) 