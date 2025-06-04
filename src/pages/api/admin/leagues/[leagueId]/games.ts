import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { ensureAdmin } from '@/lib/utils/adminAuth';
import { z } from 'zod';

const gameSchema = z.object({
  id: z.string().uuid(),
  home_team: z.string().uuid(),
  away_team: z.string().uuid(),
  home_team_name: z.string(),
  away_team_name: z.string(),
  location: z.string().nullable(),
  game_date: z.string().nullable(), // Assuming date as string
  start_time: z.string().nullable(), // Assuming time as string
  flight: z.string().nullable(), // This is the division
  status: z.enum(['scheduled', 'completed', 'cancelled', 'postponed']),
  score_home: z.number().nullable(),
  score_away: z.number().nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
});

const leagueGamesResponseSchema = z.object({
  games: z.array(gameSchema),
  availableDivisions: z.array(z.string()),
});

type LeagueGamesApiResponse = z.infer<typeof leagueGamesResponseSchema> | { error: string; issues?: z.ZodIssue[] };

const leagueIdParamSchema = z.string().uuid({ message: 'Invalid League ID format' });

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LeagueGamesApiResponse>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const adminCheckResult = await ensureAdmin(req);
  if (adminCheckResult.error) {
    return res.status(adminCheckResult.status).json({ error: adminCheckResult.error });
  }

  const { leagueId } = req.query;
  const parsedLeagueId = leagueIdParamSchema.safeParse(leagueId);
  if (!parsedLeagueId.success) {
    return res.status(400).json({ error: 'Invalid League ID.', issues: parsedLeagueId.error.issues });
  }
  const validLeagueId = parsedLeagueId.data;

  const supabase = await getSupabaseClient(); // Use service role or admin-context client

  try {
    // 1. Fetch all divisions explicitly defined for this league
    const { data: leagueDivisionsData, error: divisionsError } = await supabase
      .from('league_divisions')
      .select('name')
      .eq('league_id', validLeagueId);

    if (divisionsError) {
      console.error('Error fetching league divisions:', divisionsError);
      throw new Error(divisionsError.message);
    }
    const explicitDivisions = leagueDivisionsData?.map(d => d.name) || [];

    // 2. Fetch game_ids and their divisions from league_games junction table
    const { data: leagueGamesJunctionData, error: leagueGamesError } = await supabase
      .from('league_games')
      .select('game_id, division')
      .eq('league_id', validLeagueId);

    if (leagueGamesError) {
      console.error('Error fetching league_games junction data:', leagueGamesError);
      throw new Error(leagueGamesError.message);
    }

    if (!leagueGamesJunctionData || leagueGamesJunctionData.length === 0) {
      return res.status(200).json({ games: [], availableDivisions: explicitDivisions });
    }

    const gameIds = leagueGamesJunctionData.map(item => item.game_id);
    const divisionMap: Record<string, string | null> = leagueGamesJunctionData.reduce((map, item) => {
      map[item.game_id] = item.division || null;
      return map;
    }, {} as Record<string, string | null>);

    // 3. Fetch actual game details
    const { data: gamesData, error: gamesError } = await supabase
      .from('games')
      .select('*, home_team:home_team_id(id, name), away_team:away_team_id(id, name)')
      .in('id', gameIds)
      .order('game_date', { ascending: true });

    if (gamesError) {
      console.error('Error fetching game details:', gamesError);
      throw new Error(gamesError.message);
    }

    const formattedGames = (gamesData || []).map(game => ({
      id: game.id,
      home_team: game.home_team_id,
      away_team: game.away_team_id,
      home_team_name: game.home_team?.name || 'Unknown Team',
      away_team_name: game.away_team?.name || 'Unknown Team',
      location: game.location,
      game_date: game.game_date,
      start_time: game.game_time, // Note: field name in DB is game_time
      flight: divisionMap[game.id] || null,
      status: game.status,
      score_home: game.score_home,
      score_away: game.score_away,
      created_at: game.created_at,
      updated_at: game.updated_at,
    }));
    
    // Determine all available divisions for tabs
    const gameDivisions = Object.values(divisionMap).filter(Boolean) as string[];
    let allDivisions = [...new Set([...explicitDivisions, ...gameDivisions])];
    if (Object.values(divisionMap).some(div => !div) && !allDivisions.includes("No Division")) {
        allDivisions.push("No Division");
    }
    if (allDivisions.length === 0 && formattedGames.length > 0) { // If games exist but no divisions defined anywhere
        allDivisions.push("No Division");
    }

    const responseData = { games: formattedGames, availableDivisions: allDivisions.sort() }; // Sort for consistent order
    const parsed = leagueGamesResponseSchema.safeParse(responseData);

    if (!parsed.success) {
      console.error('League games response validation error:', parsed.error.issues);
      return res.status(500).json({ error: 'Response data validation failed.', issues: parsed.error.issues });
    }

    return res.status(200).json(parsed.data);

  } catch (error: any) {
    console.error(`Error in admin/leagues/${validLeagueId}/games handler:`, error);
    return res.status(500).json({ error: error.message || 'An unknown internal server error occurred' });
  }
} 