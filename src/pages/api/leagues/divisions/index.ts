import { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { createLeagueDivisionSchema, LeagueDivision, leagueDivisionSchema } from '@/lib/types/leagues';
import { ErrorResponse } from '@/lib/types/api';

type LeagueDivisionsResponse = {
  divisions: LeagueDivision[];
};

type LeagueDivisionResponse = {
  division: LeagueDivision;
};

type LeagueDivisionsApiResponse = LeagueDivisionsResponse | ErrorResponse;
type LeagueDivisionApiResponse = LeagueDivisionResponse | ErrorResponse;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LeagueDivisionsApiResponse | LeagueDivisionApiResponse>
) {
  const supabase = await getSupabaseClient(req.headers.authorization);

  switch (req.method) {
    case 'GET':
      try {
        const { league_id } = req.query;
        if (!league_id) {
          return res.status(400).json({ error: 'League ID is required' });
        }

        // Get all divisions for this league
        const { data: divisionsData, error: divisionsError } = await supabase
          .from('league_divisions')
          .select('*')
          .eq('league_id', league_id)
          .order('name');

        if (divisionsError) throw divisionsError;

        // Get team counts for each division
        const { data: membershipData, error: membershipError } = await supabase
          .from('team_league_memberships')
          .select('division, league_divisions!inner(name)')
          .eq('league_id', league_id)
          .not('division', 'is', null);

        if (membershipError) throw membershipError;

        // Count teams per division
        const teamCounts: Record<string, number> = {};
        membershipData.forEach((membership: any) => {
          if (!membership.division) return;
          const divisionName = membership.league_divisions?.[0]?.name || membership.division;
          teamCounts[divisionName] = (teamCounts[divisionName] || 0) + 1;
        });

        // Add team counts to division objects
        const divisionsWithCounts = divisionsData.map((division: any) => ({
          ...division,
          team_count: teamCounts[division.name] || 0
        }));

        return res.status(200).json({ divisions: divisionsWithCounts });
      } catch (error: any) {
        console.error('Error fetching league divisions:', error);
        return res.status(500).json({ error: error.message });
      }

    case 'POST':
      try {
        const validatedData = createLeagueDivisionSchema.parse(req.body);
        
        // Check if division already exists
        const { data: existingDivisions, error: checkError } = await supabase
          .from('league_divisions')
          .select('id')
          .eq('league_id', validatedData.league_id)
          .eq('name', validatedData.name);

        if (checkError) throw checkError;
        if (existingDivisions && existingDivisions.length > 0) {
          return res.status(400).json({ error: 'This division already exists' });
        }

        const { data, error } = await supabase
          .from('league_divisions')
          .insert([validatedData])
          .select()
          .single();

        if (error) throw error;
        return res.status(201).json({ division: data });
      } catch (error: any) {
        console.error('Error creating league division:', error);
        return res.status(400).json({ error: error.message });
      }

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
} 