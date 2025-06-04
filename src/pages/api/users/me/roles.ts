import { NextApiResponse, NextApiRequest } from 'next';
import { withApiAuth, AuthenticatedApiRequest } from '@/lib/auth'; // Import server-side HOC
import { TeamRolesMap } from '@/lib/types/auth';

interface UserRolesResponse {
  roles?: TeamRolesMap;
  error?: string;
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UserRolesResponse>
) {
  const apiReq = req as AuthenticatedApiRequest;
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // The user and claims are already on req by withApiAuth
  // If withApiAuth didn't find a user (and allowUnauthenticated was false), it would have already sent a 401
  if (!apiReq.user || !apiReq.claims) {
    // This should technically be caught by withApiAuth unless allowUnauthenticated is true
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const teamRoles = apiReq.claims.team_roles || {};
    return res.status(200).json({ roles: teamRoles });
  } catch (error: any) {
    console.error('[API /users/me/roles] Error:', error);
    return res.status(500).json({ error: 'Internal server error fetching roles' });
  }
}

// This endpoint should require authentication. No specific role needed to see one's own roles.
export default withApiAuth(handler, { allowUnauthenticated: false }); // Ensure user is authenticated 