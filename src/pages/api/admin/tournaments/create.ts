import type { NextApiRequest, NextApiResponse } from 'next';
import { getSupabaseClient } from '@/lib/supabaseClient';
import { withAuth } from '@/components/auth'; // Assuming a general withAuth for API routes
import { Tournament } from '@/lib/types/tournaments';
import { TeamRole } from '@/lib/types/auth';
import { getCurrentUser, isAdmin } from '@/lib/auth';

interface CreateTournamentResponse {
  tournament?: Tournament;
  message?: string;
}

const supabase = await getSupabaseClient(); // Use service client or ensure RLS allows admin inserts

async function handler(req: NextApiRequest, res: NextApiResponse<CreateTournamentResponse>) {
  const user = await getCurrentUser();
  if (!user || !isAdmin(user)) {
    return res.status(403).json({ message: 'Forbidden: Admins only.' });
  }

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
      start_date: tournamentData.start_date,
      end_date: tournamentData.end_date,
      location: tournamentData.location || null,
      status: tournamentData.status || 'upcoming',
      format: tournamentData.format || null,
      age_group: tournamentData.age_group || null,
      gender: tournamentData.gender || null,
      flight: tournamentData.flight || null,
      additional_info: tournamentData.additional_info || null,
      organizer: tournamentData.organizer || null,
      contact_email: tournamentData.contact_email || null,
      registration_deadline: tournamentData.registration_deadline || null,
      max_teams: tournamentData.max_teams || null,
      rules_url: tournamentData.rules_url || null,
      image_url: tournamentData.image_url || null
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
export default withAuth(handler); 