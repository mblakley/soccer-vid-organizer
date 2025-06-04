import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next'
import { withApiAuth } from '@/lib/auth'

type AdminApiHandler<T = any> = (
  req: NextApiRequest,
  res: NextApiResponse<T>
) => Promise<void>

/**
 * Wraps an admin API handler with authentication and admin role checks.
 * This ensures all admin endpoints are protected and require admin privileges.
 */
export function withAdminAuth<T = any>(handler: AdminApiHandler<T>): NextApiHandler<T> {
  return withApiAuth(handler, { isUserAdmin: true })
} 