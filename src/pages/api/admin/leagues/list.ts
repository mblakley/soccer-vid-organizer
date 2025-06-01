import type { NextApiRequest, NextApiResponse } from 'next'
import { getSupabaseClient } from '@/lib/supabaseClient'
import { z } from 'zod'
import { ensureAdmin } from '@/lib/utils/adminAuth' // Assuming a shared admin auth util

// Define League and Division structure for the API response
const leagueDivisionSchema = z.object({
  name: z.string(),
});

const leagueSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  season: z.string(),
  age_group: z.string().nullable(),
  gender: z.string().nullable(),
  start_date: z.string().nullable(), // Assuming date as string
  end_date: z.string().nullable(),   // Assuming date as string
  additional_info: z.any().nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
  league_divisions: z.array(leagueDivisionSchema),
});

const listLeaguesResponseSchema = z.object({
  leagues: z.array(leagueSchema),
});

type ListLeaguesApiResponse = z.infer<typeof listLeaguesResponseSchema> | { error: string; issues?: z.ZodIssue[] };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ListLeaguesApiResponse>
) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const adminCheckResult = await ensureAdmin(req);
  if (adminCheckResult.error) {
    return res.status(adminCheckResult.status).json({ error: adminCheckResult.error });
  }
  // const { user } = adminCheckResult; // Admin user object if needed

  const supabase = getSupabaseClient(); // Use service role or admin-context client

  try {
    const { data, error } = await supabase
      .from('leagues')
      .select('*, league_divisions(name)')
      .order('name');

    if (error) {
      console.error('Error fetching leagues:', error);
      throw new Error(error.message);
    }

    const responseData = { leagues: data || [] };
    const parsed = listLeaguesResponseSchema.safeParse(responseData);

    if (!parsed.success) {
      console.error('Leagues list response validation error:', parsed.error.issues);
      return res.status(500).json({ error: 'Response data validation failed.', issues: parsed.error.issues });
    }

    return res.status(200).json(parsed.data);

  } catch (error: any) {
    console.error('Error in admin/leagues/list handler:', error);
    return res.status(500).json({ error: error.message || 'An unknown internal server error occurred' });
  }
} 