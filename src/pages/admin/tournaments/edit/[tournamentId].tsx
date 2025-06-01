'use client'
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { apiClient } from '@/lib/api/client';
import { Tournament, TournamentStatus } from '@/lib/types/tournaments';
import { ErrorResponse } from '@/lib/types/auth';
import {
  AdminGetTournamentApiResponse,
  AdminUpdateTournamentRequest,
  AdminUpdateTournamentApiResponse
} from '@/lib/types/admin';
import { withAdminAuth } from '@/components/auth';
import { useTheme } from '@/contexts/ThemeContext';
import Link from 'next/link';
import { Save, XCircle, ChevronLeft, AlertTriangle, Loader2, Info } from 'lucide-react';
import { toast } from 'react-toastify';

function isErrorResponse(response: any): response is ErrorResponse {
  return response && typeof response.error === 'string';
}

function EditTournamentPage() {
  const router = useRouter();
  const { tournamentId } = router.query as { tournamentId?: string };
  const { isDarkMode } = useTheme();
  
  const [tournamentDetails, setTournamentDetails] = useState<AdminUpdateTournamentRequest>({});
  const [initialLoading, setInitialLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchTournamentData = useCallback(async () => {
    if (!tournamentId) return;
    setInitialLoading(true);
    setPageError(null);
    try {
      const response = await apiClient.get<AdminGetTournamentApiResponse>(`/api/admin/tournaments/${tournamentId}`);
      
      if (isErrorResponse(response)) {
        setPageError(response.error || 'Failed to fetch tournament details.');
        toast.error(response.error || 'Could not load tournament data.');
        return;
      }

      if (response?.tournament) {
        const fetchedTournament = response.tournament;
        setTournamentDetails({
          ...fetchedTournament,
          start_date: fetchedTournament.start_date ? new Date(fetchedTournament.start_date).toISOString().split('T')[0] : '',
          end_date: fetchedTournament.end_date ? new Date(fetchedTournament.end_date).toISOString().split('T')[0] : '',
          status: fetchedTournament.status as TournamentStatus || 'upcoming',
        });
      } else {
        setPageError(response?.message || 'Failed to fetch tournament details: Tournament not found.');
        toast.error(response?.message || 'Could not load tournament data: Tournament not found.');
      }
    } catch (err: any) {
      console.error('Error fetching tournament details:', err);
      const errorMessage = (err.response?.data?.message || err.message) as string || 'An unexpected error occurred.';
      setPageError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setInitialLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    if (tournamentId) {
        fetchTournamentData();
    }
  }, [tournamentId, fetchTournamentData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'status') {
      setTournamentDetails(prev => ({ ...prev, [name]: value as TournamentStatus }));
    } else {
      setTournamentDetails(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    if (!tournamentDetails.name || !tournamentDetails.start_date || !tournamentDetails.end_date) {
        setFormError('Tournament Name, Start Date, and End Date are required.');
        setIsSubmitting(false);
        return;
    }
    if (!tournamentId) {
        setFormError('Tournament ID is missing. Cannot update.');
        setIsSubmitting(false);
        return;
    }

    try {
      const payload: AdminUpdateTournamentRequest = {
        ...tournamentDetails,
        start_date: tournamentDetails.start_date ? new Date(tournamentDetails.start_date).toISOString().split('T')[0] : undefined,
        end_date: tournamentDetails.end_date ? new Date(tournamentDetails.end_date).toISOString().split('T')[0] : undefined,
      };

      const response = await apiClient.put<AdminUpdateTournamentApiResponse>(`/api/admin/tournaments/${tournamentId}`, payload);

      if (isErrorResponse(response)){
        throw new Error(response.error || 'Failed to update tournament.');
      }

      if (response?.tournament) {
        toast.success(response.message || 'Tournament updated successfully!');
        router.push('/admin/tournaments'); 
      } else {
        throw new Error(response?.message || 'Failed to update tournament.');
      }
    } catch (err: any) {
      console.error('Error updating tournament:', err);
      const errorMessage = (err.response?.data?.message || err.message) as string || 'Failed to update tournament.';
      setFormError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const inputClasses = `w-full px-3 py-2 rounded-md border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900'} focus:ring-blue-500 focus:border-blue-500`;
  const labelClasses = `block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`;

  if (initialLoading) {
    return (
        <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
            <Loader2 size={48} className="animate-spin text-blue-500" />
            <p className={`ml-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Loading tournament data...</p>
        </div>
    );
  }

  if (pageError && !tournamentDetails.id) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-4 ${isDarkMode ? 'bg-gray-900 text-red-400' : 'bg-gray-100 text-red-600'}`}>
        <AlertTriangle size={48} className="mb-4" />
        <h2 className="text-xl font-semibold mb-2">Error Loading Tournament Data</h2>
        <p className="text-center">{pageError}</p>
        <Link href="/admin/tournaments" legacyBehavior>
            <a className={`mt-6 px-4 py-2 rounded-md font-medium transition-colors ${isDarkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}>
                Back to List
            </a>
        </Link>
      </div>
    );
  }
  
  if (!tournamentDetails.id && !initialLoading) {
     return (
        <div className={`min-h-screen flex flex-col items-center justify-center p-4 ${isDarkMode ? 'bg-gray-900 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
            <Info size={48} className="mb-4" />
            <h2 className="text-xl font-semibold">Tournament Not Found</h2>
            <p>The tournament you are trying to edit does not exist or could not be loaded.</p>
            <Link href="/admin/tournaments" legacyBehavior>
                <a className={`mt-6 px-4 py-2 rounded-md font-medium transition-colors ${isDarkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}>
                    Back to Tournaments List
                </a>
            </Link>
        </div>
    );
  }

  return (
    <div className={`p-4 md:p-8 ${isDarkMode ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-800'}`}>
      <div className="max-w-2xl mx-auto">
        <Link href="/admin/tournaments" legacyBehavior>
            <a className={`inline-flex items-center mb-6 text-sm ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'}`}>
                <ChevronLeft size={18} className="mr-1" /> Back to Tournaments List
            </a>
        </Link>
        <h1 className="text-3xl font-bold mb-6">Edit Tournament: {tournamentDetails.name || ''}</h1>

        <form onSubmit={handleSubmit} className={`p-6 rounded-lg shadow-md space-y-4 ${isDarkMode ? 'bg-gray-700' : 'bg-white'}`}>
            {formError && (
                <div className={`p-3 mb-4 border rounded text-sm ${isDarkMode ? 'bg-red-800 border-red-600 text-red-200' : 'bg-red-100 border-red-300 text-red-700'}`} role="alert">
                    <AlertTriangle size={18} className="inline mr-2" />{formError}
                </div>
            )}

            <div>
                <label htmlFor="name" className={`${labelClasses} required-field`}>Tournament Name</label>
                <input type="text" name="name" id="name" value={tournamentDetails.name || ''} onChange={handleChange} className={inputClasses} required />
            </div>

            <div>
                <label htmlFor="description" className={labelClasses}>Description</label>
                <textarea name="description" id="description" value={tournamentDetails.description || ''} onChange={handleChange} rows={3} className={inputClasses} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="start_date" className={`${labelClasses} required-field`}>Start Date</label>
                    <input type="date" name="start_date" id="start_date" value={tournamentDetails.start_date || ''} onChange={handleChange} className={inputClasses} required />
                </div>
                <div>
                    <label htmlFor="end_date" className={`${labelClasses} required-field`}>End Date</label>
                    <input type="date" name="end_date" id="end_date" value={tournamentDetails.end_date || ''} onChange={handleChange} className={inputClasses} required />
                </div>
            </div>
            
            <div>
                <label htmlFor="location" className={labelClasses}>Location</label>
                <input type="text" name="location" id="location" value={tournamentDetails.location || ''} onChange={handleChange} className={inputClasses} placeholder="e.g., City, State or Venue Name"/>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label htmlFor="status" className={labelClasses}>Status</label>
                    <select name="status" id="status" value={tournamentDetails.status || 'upcoming'} onChange={handleChange} className={inputClasses}>
                        <option value="upcoming">Upcoming</option>
                        <option value="registration_open">Registration Open</option>
                        <option value="registration_closed">Registration Closed</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="postponed">Postponed</option>
                    </select>
                </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4">
                <Link href="/admin/tournaments" legacyBehavior>
                    <a className={`px-4 py-2 text-sm rounded-md font-medium transition-colors flex items-center ${isDarkMode ? 'bg-gray-600 hover:bg-gray-500 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}>
                        <XCircle size={18} className="mr-2"/> Cancel
                    </a>
                </Link>
                <button 
                    type="submit"
                    disabled={isSubmitting || initialLoading}
                    className={`px-4 py-2 text-sm rounded-md font-medium flex items-center transition-colors text-white ${isDarkMode ? 'bg-blue-600 hover:bg-blue-500' : 'bg-blue-500 hover:bg-blue-600'} disabled:opacity-50`}
                >
                    {isSubmitting ? <Loader2 size={18} className="animate-spin mr-2"/> : <Save size={18} className="mr-2"/>}
                    Save Changes
                </button>
            </div>
        </form>
      </div>
      <style jsx global>{`
        .required-field::after {
          content: " *";
          color: ${isDarkMode ? '#F87171' /* red-400 */ : '#EF4444' /* red-500 */};
        }
      `}</style>
    </div>
  );
}

export default withAdminAuth(EditTournamentPage, 'Edit Tournament'); 