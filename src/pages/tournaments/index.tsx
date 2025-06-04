import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
// import { supabase } from '@/lib/supabaseClient'; // To be removed
import { apiClient } from '@/lib/api/client'; // Import apiClient
import { Tournament } from '@/lib/types/tournaments'; // Import Tournament type
import { withAuth } from '@/components/auth'; // Assuming withAuth is used for page access control
import { useTheme } from '@/contexts/ThemeContext'; // Assuming theme context for styling
import { TeamRole } from '@/lib/types/auth';

/*
// Local Tournament interface to be removed
interface Tournament {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  created_at: string;
}
*/

interface ListTournamentsApiResponse {
  tournaments: Tournament[];
  message?: string;
}

function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const router = useRouter();
  const { isDarkMode } = useTheme(); // Get theme status

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    setLoading(true);
    setPageError(null);
    try {
      const data = await apiClient.get<ListTournamentsApiResponse>('/api/tournaments/list');
      if (data && data.tournaments) {
        setTournaments(data.tournaments);
      } else {
        setTournaments([]);
        const errorMessage = data?.message || 'Failed to fetch tournaments or no tournaments found.';
        setPageError(errorMessage);
        console.error('Error fetching tournaments:', errorMessage);
      }
    } catch (error: any) {
      console.error('Exception fetching tournaments:', error);
      setPageError(error.message || 'An unexpected error occurred while fetching tournaments.');
      setTournaments([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  // Basic rendering, can be expanded based on actual UI requirements
  return (
    <div className={`container mx-auto py-8 px-4 ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
      <h1 className="text-3xl font-bold mb-6">Tournaments</h1>
      
      {pageError && (
        <div className={`mb-4 p-3 text-sm rounded ${isDarkMode ? 'bg-red-800 text-red-200' : 'bg-red-100 text-red-700'}`} role="alert">
          {pageError}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : tournaments.length === 0 && !pageError ? (
        <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>No tournaments found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((tournament) => (
            <div 
              key={tournament.id} 
              className={`rounded-lg shadow-lg p-6 cursor-pointer transition-all hover:shadow-xl ${
                isDarkMode ? 'bg-gray-800 border-gray-700 hover:border-blue-500' : 'bg-white border-gray-200 hover:border-blue-500'
              } border`}
              onClick={() => router.push(`/tournaments/${tournament.id}`)} // Assuming a detail page exists
            >
              <h2 className="text-xl font-semibold mb-2 truncate" title={tournament.name}>{tournament.name}</h2>
              {tournament.description && (
                <p className={`text-sm mb-3 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} h-10 overflow-hidden`}>
                  {tournament.description}
                </p>
              )}
              <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                <p>Starts: {formatDate(tournament.start_date)}</p>
                <p>Ends: {formatDate(tournament.end_date)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Apply authentication as needed. For instance, allowing any authenticated user:
export default withAuth(TournamentsPage, {
  teamId: 'any',
  roles: [], // No specific roles needed, just authenticated
  requireRole: false, // User doesn't need to have a role in any team
}, 'Tournaments'); 