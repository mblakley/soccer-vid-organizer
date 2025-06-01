import { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { withAuth } from '@/components/auth';
import { TeamRole } from '@/lib/types';

interface TournamentFlightsResponse {
  flights?: string[];
  message?: string;
}

const supabase = getSupabaseClient();

async function handler(req: NextApiRequest, res: NextApiResponse<TournamentFlightsResponse>) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { tournamentId } = req.query;

  if (typeof tournamentId !== 'string') {
    return res.status(400).json({ message: 'tournamentId path parameter is required and must be a string.' });
  }

  try {
    // Get flights from tournament_teams
    const { data: teamFlightsData, error: teamFlightsError } = await supabase
      .from('tournament_teams')
      .select('flight')
      .eq('tournament_id', tournamentId)
      .not('flight', 'is', null);

    if (teamFlightsError) {
      console.error(`Error fetching team flights for tournament ${tournamentId}:`, teamFlightsError);
      return res.status(500).json({ message: teamFlightsError.message || 'Failed to fetch team flights.' });
    }

    // Get flights from tournament_games
    const { data: gameFlightsData, error: gameFlightsError } = await supabase
      .from('tournament_games')
      .select('flight')
      .eq('tournament_id', tournamentId)
      .not('flight', 'is', null);

    if (gameFlightsError) {
      console.error(`Error fetching game flights for tournament ${tournamentId}:`, gameFlightsError);
      return res.status(500).json({ message: gameFlightsError.message || 'Failed to fetch game flights.' });
    }
    
    const teamFlights = teamFlightsData?.map(item => item.flight).filter(f => f) as string[] || [];
    const gameFlights = gameFlightsData?.map(item => item.flight).filter(f => f) as string[] || [];
    
    const allFlights = [...teamFlights, ...gameFlights];
    const uniqueFlights = [...new Set(allFlights)].sort(); // Sort for consistent order

    return res.status(200).json({ flights: uniqueFlights });

  } catch (err: any) {
    console.error(`Exception fetching flights for tournament ${tournamentId}:`, err);
    return res.status(500).json({ message: err.message || 'An unexpected error occurred' });
  }
}

// Adjust auth as needed for viewing tournament flight information
export default withAuth(handler, {
  teamId: 'any',
  roles: ['admin', 'coach'] as TeamRole[], // Example: admins and coaches can see this
  requireRole: true,
}); 