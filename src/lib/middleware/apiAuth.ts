import { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'

type NextApiHandler = (req: NextApiRequest, res: NextApiResponse) => Promise<void>

export function withApiAdminAuth(handler: NextApiHandler) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const supabase = await getSupabaseClient(req.headers.authorization)

      // Authenticate user
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        console.error('Authentication error:', authError)
        return res.status(401).json({ error: 'Unauthorized' })
      }

      // Check if user has admin role
      const { data: userRole, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single()

      if (roleError || !userRole) {
        console.error('Role check error:', roleError)
        return res.status(403).json({ error: 'Forbidden: Admin access required' })
      }

      // If authentication and role check pass, proceed with the handler
      return handler(req, res)
    } catch (error: any) {
      console.error('Error in withApiAdminAuth middleware:', error)
      const statusCode = error.message?.includes('Unauthorized') ? 401 : 500
      return res.status(statusCode).json({ error: error.message || 'An unknown internal server error occurred' })
    }
  }
} 