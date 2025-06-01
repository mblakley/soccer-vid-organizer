import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { ensureAdmin } from '@/lib/utils/adminAuth';
import { z } from 'zod';

// Response type for delete operation
type DeleteLeagueResponse = { message?: string; error?: string; issues?: z.ZodIssue[] };

// Zod schema for validating the leagueId path parameter
const leagueIdSchema = z.string().uuid({ message: 'Invalid League ID format' });

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DeleteLeagueResponse>
) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const adminCheckResult = await ensureAdmin(req);
  if (adminCheckResult.error) {
    return res.status(adminCheckResult.status).json({ error: adminCheckResult.error });
  }

  const { leagueId } = req.query;

  // Validate leagueId
  const parsedLeagueId = leagueIdSchema.safeParse(leagueId);
  if (!parsedLeagueId.success) {
    return res.status(400).json({ 
      error: 'Invalid League ID.',
      issues: parsedLeagueId.error.issues,
    });
  }

  const validLeagueId = parsedLeagueId.data;
  const supabase = getSupabaseClient(); // Use service role client for deletion

  try {
    // It's good practice to check if the league exists before attempting to delete,
    // though Supabase delete won't error if the row doesn't exist (it will just affect 0 rows).
    // Add cascade delete in Supabase for related tables (league_divisions, league_games) or handle them here.

    const { error: deleteError } = await supabase
      .from('leagues')
      .delete()
      .eq('id', validLeagueId);

    if (deleteError) {
      console.error('Error deleting league:', deleteError);
      // Handle potential errors, e.g., foreign key constraints if not set to cascade
      if (deleteError.code === '23503') { // foreign key violation
        return res.status(409).json({ error: 'Cannot delete league: It is still referenced by other records (e.g., divisions, games). Please remove associations first.' });
      }
      throw new Error(deleteError.message);
    }

    return res.status(200).json({ message: 'League deleted successfully' });

  } catch (error: any) {
    console.error(`Error in admin/leagues/${validLeagueId}/delete handler:`, error);
    return res.status(500).json({ error: error.message || 'An unknown internal server error occurred' });
  }
} 