import { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { withApiAuth } from '@/lib/auth';
import { TeamRole } from '@/lib/types/auth';
import { Game } from '@/lib/types/games';
import { TournamentGameEntry } from '@/lib/types/tournaments';

interface AuthenticatedRequest extends NextApiRequest {
  user?: { id: string };
}

// Response for GET
interface ListTournamentGamesResponse {
  games?: Game[];
  message?: string;
}

// Response for POST
interface AddGameToTournamentResponse {
  tournamentGameEntry?: TournamentGameEntry;
  message?: string;
}

async function handler(req: AuthenticatedRequest, res: NextApiResponse<ListTournamentGamesResponse | AddGameToTournamentResponse | { message: string }>) {
  const { tournamentId } = req.query;

  if (typeof tournamentId !== 'string') {
    return res.status(400).json({ message: 'tournamentId path parameter is required and must be a string.' });
  }

  const supabase = await getSupabaseClient(req.headers.authorization);

  if (req.method === 'GET') {
    try {
      // Fetch game_ids from tournament_games for the given tournamentId
      const { data: tournamentGameLinks, error: linksError } = await supabase
        .from('tournament_games')
        .select('game_id, flight') // Also select flight from the junction table
        .eq('tournament_id', tournamentId);

      if (linksError) {
        console.error(`Error fetching game links for tournament ${tournamentId}:`, linksError);
        return res.status(500).json({ message: linksError.message || 'Failed to fetch game links for tournament' });
      }

      if (!tournamentGameLinks || tournamentGameLinks.length === 0) {
        return res.status(200).json({ games: [] });
      }

      const gameIds = tournamentGameLinks.map(link => link.game_id);
      const gameFlightsMap = new Map(tournamentGameLinks.map(link => [link.game_id, link.flight]));

      // Fetch actual game details for these game_ids
      const { data: gamesData, error: gamesError } = await supabase
        .from('games')
        .select(`
          *,
          home_team:home_team_id(id, name, short_name),
          away_team:away_team_id(id, name, short_name)
        `)
        .in('id', gameIds)
        .order('game_date', { ascending: true });

      if (gamesError) {
        console.error(`Error fetching game details for tournament ${tournamentId}:`, gamesError);
        return res.status(500).json({ message: gamesError.message || 'Failed to fetch game details' });
      }
      
      const formattedGames: Game[] = (gamesData || []).map((game: any) => ({
        ...game,
        home_team_name: game.home_team?.name || game.home_team_id || 'N/A',
        away_team_name: game.away_team?.name || game.away_team_id || 'N/A',
        flight: gameFlightsMap.get(game.id) || game.flight, // Prioritize flight from tournament_games
      }));

      return res.status(200).json({ games: formattedGames });

    } catch (err: any) {
      console.error(`Exception fetching games for tournament ${tournamentId}:`, err);
      return res.status(500).json({ message: err.message || 'An unexpected error occurred' });
    }
  } else if (req.method === 'POST') {
    if (!req.user?.id) {
        return res.status(401).json({ message: 'Unauthorized. User must be logged in.' });
    }
    const { game_id, flight } = req.body;

    if (!game_id || typeof game_id !== 'string') {
      return res.status(400).json({ message: 'game_id is required in the request body.' });
    }
    if (flight && typeof flight !== 'string') {
        return res.status(400).json({ message: 'flight must be a string if provided.' });
    }

    try {
      // Check if the game already exists in the tournament to prevent duplicates
      const { data: existingLink, error: checkError } = await supabase
        .from('tournament_games')
        .select('id')
        .eq('tournament_id', tournamentId)
        .eq('game_id', game_id)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing tournament game link:', checkError);
        return res.status(500).json({ message: checkError.message || 'Error checking for existing game in tournament.' });
      }

      if (existingLink) {
        return res.status(409).json({ message: 'This game is already added to this tournament.' });
      }

      const newTournamentGameEntry: Partial<TournamentGameEntry> = {
        tournament_id: tournamentId,
        game_id,
        flight: flight || null,
        // created_by: req.user.id, // If your table has a created_by field
      };
      
      const { data: insertedData, error: insertError } = await supabase
        .from('tournament_games')
        .insert(newTournamentGameEntry)
        .select()
        .single();

      if (insertError) {
        console.error('Error adding game to tournament:', insertError);
        return res.status(500).json({ message: insertError.message || 'Failed to add game to tournament' });
      }

      return res.status(201).json({ tournamentGameEntry: insertedData as TournamentGameEntry, message: 'Game added to tournament successfully.' });

    } catch (err: any) {
      console.error('Exception adding game to tournament:', err);
      return res.status(500).json({ message: err.message || 'An unexpected error occurred' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

// Adjust auth requirements. Adding games might be admin/coach restricted.
export default withApiAuth(handler, {
  allowUnauthenticated: false
}); 