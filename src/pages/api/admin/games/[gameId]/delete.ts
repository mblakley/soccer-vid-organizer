import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { ensureAdmin } from '@/lib/utils/adminAuth';
import { z } from 'zod';

type DeleteGameResponse = { message?: string; error?: string; issues?: z.ZodIssue[] };

const gameIdParamSchema = z.string().uuid({ message: 'Invalid Game ID format' });
const leagueIdQuerySchema = z.string().uuid({ message: 'Invalid League ID format for query parameter' }).optional(); // League ID is optional for general game delete

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DeleteGameResponse>
) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const adminCheckResult = await ensureAdmin(req);
  if (adminCheckResult.error) {
    return res.status(adminCheckResult.status).json({ error: adminCheckResult.error });
  }

  const { gameId } = req.query;
  const leagueIdQP = req.query.leagueId; // leagueId from query param for junction table deletion

  const parsedGameId = gameIdParamSchema.safeParse(gameId);
  if (!parsedGameId.success) {
    return res.status(400).json({ error: 'Invalid Game ID.', issues: parsedGameId.error.issues });
  }
  const validGameId = parsedGameId.data;

  let validLeagueId: string | undefined;
  if (leagueIdQP) {
    const parsedLeagueId = leagueIdQuerySchema.safeParse(leagueIdQP);
    if (!parsedLeagueId.success) {
      return res.status(400).json({ error: 'Invalid League ID in query parameter.', issues: parsedLeagueId.error.issues });
    }
    validLeagueId = parsedLeagueId.data;
  }

  const supabase = await getSupabaseClient(); // Use service role client

  try {
    // If leagueId is provided, first delete the relationship from league_games
    if (validLeagueId) {
      const { error: leagueGameError } = await supabase
        .from('league_games')
        .delete()
        .eq('game_id', validGameId)
        .eq('league_id', validLeagueId);
      
      if (leagueGameError) {
        console.error('Error deleting from league_games junction:', leagueGameError);
        throw new Error(leagueGameError.message);
      }
    }

    // Then, delete the game itself from the games table
    // Note: If a game can exist without being in any league and you want to delete it fully,
    // this part should run. If a game should only be unlinked from a league, you might omit this.
    // For now, the original logic implies deleting the game record too.
    const { error: gameDeleteError } = await supabase
      .from('games')
      .delete()
      .eq('id', validGameId);

    if (gameDeleteError) {
      console.error('Error deleting game:', gameDeleteError);
      // If the error is because the game is referenced by other tables (e.g. other leagues, tournaments)
      // and cascade is not set, this will fail. Code 23503 is foreign key violation.
      if (gameDeleteError.code === '23503') {
          return res.status(409).json({ error: 'Cannot delete game: It is still referenced by other records. Ensure it is removed from all associations or set up cascade deletes.'});
      }
      throw new Error(gameDeleteError.message);
    }

    return res.status(200).json({ message: 'Game deleted successfully' });

  } catch (error: any) {
    console.error(`Error in admin/games/${validGameId}/delete handler:`, error);
    return res.status(500).json({ error: error.message || 'An unknown internal server error occurred' });
  }
} 