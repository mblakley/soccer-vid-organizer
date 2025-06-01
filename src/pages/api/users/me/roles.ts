import { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { withAuth } from '@/components/auth'; // Assuming withAuth provides user context
import { TeamRole } from '@/lib/types';

interface AuthenticatedRequest extends NextApiRequest {
  user?: { id: string; }; // Assuming withAuth injects user object with id
}

interface UserRolesResponse {
  roles?: TeamRole[]; // Or string[] if just role names are needed
  message?: string;
  hasNoRoles?: boolean;
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse<UserRolesResponse>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  if (!req.user || !req.user.id) {
    return res.status(401).json({ message: 'Unauthorized: User not found in request' });
  }

  const supabase = getSupabaseClient(req.headers.authorization); // User-context client

  try {
    // Fetch user roles from team_members and team_member_roles
    // This query assumes your schema: team_members -> user_id, team_member_roles -> team_member_id, role
    // Adjust the query based on your actual database structure for roles.
    const { data: teamMembersData, error: teamMembersError } = await supabase
      .from('team_members')
      .select(`
        team_id,
        teams (name),
        team_member_roles (role)
      `)
      .eq('user_id', req.user.id)
      .eq('is_active', true); // Only consider active memberships

    if (teamMembersError) {
      console.error('Error fetching user roles:', teamMembersError);
      return res.status(500).json({ message: teamMembersError.message || 'Failed to fetch user roles' });
    }

    if (!teamMembersData) {
        return res.status(200).json({ roles: [], hasNoRoles: true });
    }

    const roles: TeamRole[] = teamMembersData.flatMap((tm: any) => 
      tm.team_member_roles.map((r: any) => r.role as TeamRole)
    );
    // Remove duplicates if a user can have the same role in multiple teams but you only want unique role names
    const uniqueRoles = [...new Set(roles)];

    return res.status(200).json({ roles: uniqueRoles, hasNoRoles: uniqueRoles.length === 0 });

  } catch (err: any) {
    console.error('Exception fetching user roles:', err);
    return res.status(500).json({ message: err.message || 'An unexpected error occurred' });
  }
}

// This endpoint should require authentication
export default withAuth(handler, {
  teamId: 'any', // Not specific to one team, applies to the user across all their teams
  roles: [], // Any authenticated user can access their own roles
  requireRole: false, // No specific role needed to call this for oneself
}); 