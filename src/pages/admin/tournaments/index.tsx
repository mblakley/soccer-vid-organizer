'use client'
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { apiClient } from '@/lib/api/client';
import { Tournament } from '@/lib/types/tournaments';
import { ErrorResponse } from '@/lib/types/auth';
import {
  AdminListTournamentsApiResponse,
  AdminDeleteTournamentApiResponse
} from '@/lib/types/admin';
import { withAdminAuth } from '@/components/auth'; // Use withAdminAuth for admin-only pages
import { useTheme } from '@/contexts/ThemeContext';
import { PlusCircle, Edit, Trash2, ExternalLink, Search, Calendar, MapPin, AlertTriangle, Loader2, Info, List, CalendarDays } from 'lucide-react';
import { toast } from 'react-toastify';

// Type guard for ErrorResponse
function isErrorResponse(response: any): response is ErrorResponse {
  return response && typeof response.error === 'string';
}

function AdminTournamentsPage() {
  const router = useRouter();
  const { isDarkMode } = useTheme();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchTournaments = useCallback(async () => {
    setLoading(true);
    setPageError(null);
    try {
      // Use new AdminListTournamentsApiResponse type
      const response = await apiClient.get<AdminListTournamentsApiResponse>('/api/tournaments/list'); // Assuming admin uses general /api/tournaments/list or it's an admin specific one returning this shape.
      
      if (isErrorResponse(response)){
        setPageError(response.error || 'Failed to fetch tournaments');
        setTournaments([]);
      } else if (response?.tournaments) {
        setTournaments(response.tournaments);
      } else {
        setTournaments([]);
        if (response?.message) setPageError(response.message);
      }
    } catch (err: any) {
      console.error('Error fetching tournaments:', err);
      setTournaments([]);
      setPageError(err.message || 'Failed to fetch tournaments.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  const handleDeleteTournament = async (tournamentId: string) => {
    if (!confirm('Are you sure you want to delete this tournament? This action cannot be undone.')) return;
    
    setPageError(null);
    try {
      // Use new AdminDeleteTournamentApiResponse type
      const response = await apiClient.delete<AdminDeleteTournamentApiResponse>(`/api/tournaments/${tournamentId}`);
      
      if (isErrorResponse(response) || (response && response.success === false)) {
        const errorMsg = isErrorResponse(response) ? response.error : (response?.message || 'Failed to delete tournament');
        throw new Error(errorMsg);
      }
      toast.success(response.message || 'Tournament deleted successfully!');
      fetchTournaments(); 
    } catch (err: any) {
      console.error('Error deleting tournament:', err);
      const errorMessage = (err.response?.data?.message || err.message)  as string || 'Failed to delete tournament.';
      setPageError(errorMessage);
      toast.error(errorMessage);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) { return 'Invalid Date'; }
  };

  const filteredTournaments = tournaments.filter(tournament => 
    tournament.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tournament.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tournament.status?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && tournaments.length === 0) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
        <Loader2 size={48} className="animate-spin text-blue-500" />
        <p className={`ml-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Loading tournaments...</p>
      </div>
    );
  }

  return (
    <div className={`p-4 md:p-8 ${isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-800'}`}>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-3xl font-bold flex items-center"><List size={32} className="mr-3"/>Manage Tournaments</h1>
        <Link href="/admin/tournaments/create" legacyBehavior>
          <a className={`px-4 py-2 rounded-md font-medium flex items-center transition-colors text-white ${isDarkMode ? 'bg-green-600 hover:bg-green-500' : 'bg-green-500 hover:bg-green-600'}`}>
            <PlusCircle size={18} className="mr-2" /> Create New Tournament
          </a>
        </Link>
      </div>

      {pageError && (
        <div className={`p-3 mb-4 border rounded ${isDarkMode ? 'bg-red-800 border-red-600 text-red-200' : 'bg-red-100 border-red-300 text-red-700'}`} role="alert">
          <h3 className="font-semibold flex items-center"><AlertTriangle size={18} className="mr-2"/>Error</h3>
          <p>{pageError}</p>
          <button onClick={fetchTournaments} className="mt-2 text-xs underline">Try refreshing</button>
        </div>
      )}

      <div className={`mb-6 p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-white shadow-sm'}`}>
        <div className="relative">
          <input 
            type="text"
            placeholder="Search tournaments (name, location, status)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-3 py-2 rounded-md border ${isDarkMode ? 'bg-gray-600 border-gray-500 text-white placeholder-gray-400' : 'bg-white border-gray-300'} focus:ring-blue-500 focus:border-transparent`}
          />
          <Search size={18} className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
        </div>
      </div>

      {loading && tournaments.length > 0 && (
          <div className="flex justify-center items-center py-6"><Loader2 size={24} className="animate-spin text-blue-500" /><p className="ml-2">Refreshing list...</p></div>
      )}

      {!loading && filteredTournaments.length === 0 ? (
        <div className={`text-center py-10 px-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-white shadow'}`}>
          <Info size={48} className={`mx-auto mb-4 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`} />
          <h3 className="text-xl font-semibold mb-2">
            {searchTerm ? 'No Tournaments Match Your Search' : 'No Tournaments Found'}
          </h3>
          <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
            {searchTerm ? 'Try a different search term.' : 'Click the button above to create the first tournament.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTournaments.map((tournament) => (
            <div key={tournament.id} className={`p-4 rounded-lg shadow-md ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}>
              <div className="flex flex-col sm:flex-row justify-between items-start">
                <div className="mb-2 sm:mb-0 flex-grow">
                  <h2 className="text-xl font-semibold">
                    <Link href={`/tournaments/${tournament.id}`} legacyBehavior><a className={`hover:underline ${isDarkMode?'text-blue-300':'text-blue-600'}`}>{tournament.name}</a></Link>
                  </h2>
                  {tournament.description && <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{tournament.description}</p>}
                </div>
                <div className={`text-sm capitalize flex-shrink-0 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Status: <span className={`font-semibold px-1.5 py-0.5 rounded-full text-xs ${tournament.status === 'completed' ? (isDarkMode?'bg-green-700 text-green-200':'bg-green-200 text-green-800') : tournament.status === 'upcoming' ? (isDarkMode?'bg-blue-700 text-blue-200':'bg-blue-200 text-blue-800') : tournament.status === 'in_progress' ? (isDarkMode?'bg-yellow-600 text-yellow-100':'bg-yellow-200 text-yellow-800') : (isDarkMode?'bg-gray-600':'bg-gray-200')}`}>{tournament.status || 'N/A'}</span>
                </div>
              </div>
              <div className={`mt-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <div className="flex items-center mb-1">
                  <CalendarDays size={15} className="mr-2 flex-shrink-0" /> 
                  <span>{formatDate(tournament.start_date)} - {formatDate(tournament.end_date)}</span>
                </div>
                {tournament.location && 
                  <div className="flex items-center">
                    <MapPin size={15} className="mr-2 flex-shrink-0" /> 
                    <span>{tournament.location}</span>
                  </div>
                }
              </div>
              <div className="mt-3 flex flex-wrap gap-2 items-center">
                <Link href={`/tournaments/${tournament.id}`} legacyBehavior>
                    <a className={`px-3 py-1 text-xs rounded-md font-medium flex items-center transition-colors ${isDarkMode ? 'bg-sky-600 hover:bg-sky-500 text-white' : 'bg-sky-500 hover:bg-sky-600 text-white'}`}>
                        <ExternalLink size={14} className="mr-1.5" /> View Details
                    </a>
                </Link>
                <Link href={`/admin/tournaments/edit/${tournament.id}`} legacyBehavior>
                  <a className={`px-3 py-1 text-xs rounded-md font-medium flex items-center transition-colors ${isDarkMode ? 'bg-yellow-500 hover:bg-yellow-400 text-gray-900' : 'bg-yellow-400 hover:bg-yellow-500 text-gray-800'}`}>
                    <Edit size={14} className="mr-1.5" /> Edit
                  </a>
                </Link>
                <button 
                  onClick={() => handleDeleteTournament(tournament.id)}
                  className={`px-3 py-1 text-xs rounded-md font-medium flex items-center transition-colors ${isDarkMode ? 'bg-red-700 hover:bg-red-600 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}`}
                >
                  <Trash2 size={14} className="mr-1.5" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* TODO: Add pagination if list becomes very long */} 
    </div>
  );
}

export default withAdminAuth(AdminTournamentsPage, 'Manage Tournaments'); 