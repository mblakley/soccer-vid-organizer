import { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { withAuth } from '@/components/auth';
import { TeamRole } from '@/lib/types/auth';
import { RosterEntry, Player } from '@/lib/types/players';

// Define the response for listing roster entries, potentially with joined player data
interface ListRosterEntriesResponse {
  rosterEntries?: (RosterEntry & { player?: Player })[]; // Embed player details
  message?: string;
}

async function handler(req: NextApiRequest, res: NextApiResponse<ListRosterEntriesResponse>) {
  if (req.method === 'GET') {
    const { gameId, teamId } = req.query;

    if (!gameId || typeof gameId !== 'string') {
      return res.status(400).json({ message: 'gameId query parameter is required' });
    }

    // Optionally filter by teamId if provided and relevant for your RLS or query logic
    // const currentTeamId = typeof teamId === 'string' ? teamId : undefined;

    try {
      // Fetch roster entries and join with players table to get player names/details
      // Adjust the select query based on what player details you need
      let query = getSupabaseClient()
        .from('roster_entries')
        .select(`