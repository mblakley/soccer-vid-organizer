import { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { withAuth } from '@/components/auth';
import { TeamRole } from '@/lib/types/auth';
import { League } from '@/lib/types/leagues';

interface AuthenticatedRequest extends NextApiRequest {
  user?: { id: string; }; // Assuming withAuth injects user with id
  // team_roles from JWT might be useful here for RLS or direct filtering if available
}

interface ListLeaguesResponse {
  leagues?: League[];
  message?: string;
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse<ListLeaguesResponse>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const supabase = await getSupabaseClient(req.headers.authorization); // User-context for RLS if applicable
  // Or service client if complex joins bypass RLS effectively: const supabase = await getSupabaseClient();

  const { teamId, userTeamIds } = req.query; // userTeamIds expected as comma-separated string

  try {
    let leagueIdsToQuery: string[] | null = null;

    if (teamId && typeof teamId === 'string') {
      // Fetch league IDs for a single specified team
      const { data: singleTeamLeagues, error: singleTeamError } = await supabase
        .from('team_league_memberships')
        .select('league_id')
        .eq('team_id', teamId);
      if (singleTeamError) throw singleTeamError;
      if (!singleTeamLeagues || singleTeamLeagues.length === 0) {
        return res.status(200).json({ leagues: [] }); // No leagues for this team
      }
      leagueIdsToQuery = singleTeamLeagues.map(tl => tl.league_id);
    } else if (userTeamIds && typeof userTeamIds === 'string') {
      // Fetch league IDs for multiple teams (e.g., all teams a user belongs to)
      const teamIdsArray = userTeamIds.split(',').filter(id => id.trim());
      if (teamIdsArray.length > 0) {
        const { data: multiTeamLeagues, error: multiTeamError } = await supabase
          .from('team_league_memberships')
          .select('league_id')
          .in('team_id', teamIdsArray);
        if (multiTeamError) throw multiTeamError;
        if (!multiTeamLeagues || multiTeamLeagues.length === 0) {
          return res.status(200).json({ leagues: [] }); // No leagues for these teams
        }
        leagueIdsToQuery = [...new Set(multiTeamLeagues.map(tl => tl.league_id))]; // Unique league IDs
      } else {
         // No userTeamIds provided or empty array, so fetch all leagues (or based on RLS)
      }
    } 
    // If neither teamId nor userTeamIds, fetch all leagues user has access to (RLS should handle this)
    // or if this endpoint is admin-only, it could fetch all leagues.

    let query = supabase.from('leagues').select('*').order('name');

    if (leagueIdsToQuery && leagueIdsToQuery.length > 0) {
      query = query.in('id', leagueIdsToQuery);
    } else if (teamId || userTeamIds) {
      // If teamId or userTeamIds were provided but resulted in no league IDs, return empty.
      // This case is handled by early returns above, but as a safeguard:
      return res.status(200).json({ leagues: [] });
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching leagues:', error);
      return res.status(500).json({ message: error.message || 'Failed to fetch leagues' });
    }

    return res.status(200).json({ leagues: data || [] });

  } catch (err: any) {
    console.error('Exception fetching leagues:', err);
    return res.status(500).json({ message: err.message || 'An unexpected error occurred' });
  }
}

// Adjust auth. Listing leagues might be restricted based on team membership.
export default withAuth(handler, {
  teamId: 'any', // This API can be called in context of a team, or for all user's teams
  roles: ['coach', 'player', 'parent', 'manager'] as TeamRole[],
  requireRole: true, // User needs to be part of at least one team to see leagues (unless RLS allows public access)
}); 