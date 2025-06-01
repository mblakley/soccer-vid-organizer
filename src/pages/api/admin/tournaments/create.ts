import { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { withAuth } from '@/components/auth'; // Assuming a general withAuth for API routes
import { Tournament, TeamRole } from '@/lib/types';

interface CreateTournamentResponse {
  tournament?: Tournament;
  message?: string;
}

const supabase = getSupabaseClient(); // Use service client or ensure RLS allows admin inserts

async function handler(req: NextApiRequest, res: NextApiResponse<CreateTournamentResponse>) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const tournamentData = req.body as Partial<Tournament>;

  // Basic validation (more comprehensive validation can be added)
  if (!tournamentData.name || !tournamentData.start_date || !tournamentData.end_date) {
    return res.status(400).json({ message: 'Name, start date, and end date are required for a tournament.' });
  }

  try {
    // Prepare data for insertion. Ensure dates are in ISO format if not already.
    // Supabase client typically handles JS Date objects correctly.
    const newTournament: Omit<Tournament, 'id' | 'created_at' | 'updated_at'> & { created_at?: string, updated_at?: string } = {
      name: tournamentData.name,
      description: tournamentData.description || null,
      start_date: tournamentData.start_date, // Ensure this is a valid date string or null
      end_date: tournamentData.end_date,     // Ensure this is a valid date string or null
      location: tournamentData.location || null,
      status: tournamentData.status || 'upcoming',
      format: tournamentData.format || null,
      age_group: tournamentData.age_group || null,
      additional_info: tournamentData.additional_info || null,
      // created_at and updated_at will be set by the database by default
    };

    const { data, error } = await supabase
      .from('tournaments')
      .insert(newTournament)
      .select()
      .single(); // Assuming you want to return the created tournament

    if (error) {
      console.error('Error creating tournament:', error);
      // Handle specific errors, e.g., unique constraint violation
      if (error.code === '23505') { // Unique violation
        return res.status(409).json({ message: `A tournament with similar details (e.g., name and dates) might already exist. ${error.details}` });
      }
      return res.status(500).json({ message: error.message || 'Failed to create tournament' });
    }

    return res.status(201).json({ tournament: data as Tournament, message: 'Tournament created successfully.' });

  } catch (err: any) {
    console.error('Exception creating tournament:', err);
    return res.status(500).json({ message: err.message || 'An unexpected error occurred' });
  }
}

// Admin-only endpoint
export default withAuth(handler, {
  teamId: 'any',
  roles: ['admin'] as TeamRole[], // Only admins can create tournaments
  requireRole: true,
}); 