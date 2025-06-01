'use client'
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { apiClient } from '@/lib/api/client';
import { Tournament, Game, TeamRole, Player, GameStatus } from '@/lib/types'; // Assuming GameStatus is defined or add it
import { withAuth, User } from '@/components/auth';
import { useTheme } from '@/contexts/ThemeContext';
import Link from 'next/link';
import { CalendarDays, MapPin, Users, PlusCircle, Trash2, Edit2, ChevronLeft, AlertTriangle, Info, Loader2, ShieldCheck, CheckCircle, XCircle, Filter, Search } from 'lucide-react';
import { toast } from 'react-toastify';

// API Response Interfaces
interface TournamentDetailsApiResponse {
  tournament?: Tournament;
  message?: string;
}

interface TournamentGamesApiResponse {
  games?: Game[];
  message?: string;
}

interface AllGamesApiResponse {
  games?: Game[];
  message?: string;
}

interface AddGameToTournamentResponse {
  tournamentGameEntry?: any; // Adjust based on actual response from POST /api/tournaments/[tournamentId]/games
  message?: string;
}

interface RemoveGameFromTournamentResponse {
  message?: string;
}

interface TournamentPageProps {
  user: User;
}

function TournamentPage({ user }: TournamentPageProps) {
  const router = useRouter();
  const { tournamentId } = router.query as { tournamentId?: string };
  const { isDarkMode } = useTheme();

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [tournamentGames, setTournamentGames] = useState<Game[]>([]);
  const [allAvailableGames, setAllAvailableGames] = useState<Game[]>([]); // For the "Add Game" modal
  const [loadingTournament, setLoadingTournament] = useState(true);
  const [loadingGames, setLoadingGames] = useState(false);
  const [loadingAllGames, setLoadingAllGames] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [isAddGameModalOpen, setIsAddGameModalOpen] = useState(false);
  const [selectedGameToAdd, setSelectedGameToAdd] = useState<string>('');
  const [selectedFlightForNewGame, setSelectedFlightForNewGame] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [flightFilter, setFlightFilter] = useState<string>('');
  const [availableFlights, setAvailableFlights] = useState<string[]>([]);

  const canManageTournament = user?.roles?.includes('admin') || user?.roles?.includes('coach');

  const fetchTournamentDetails = useCallback(async () => {
    if (!tournamentId) return;
    setLoadingTournament(true);
    setPageError(null);
    try {
      const data = await apiClient.get<TournamentDetailsApiResponse>(`/api/admin/tournaments/${tournamentId}`); // Assuming admin endpoint for details
      if (data?.tournament) {
        setTournament(data.tournament);
      } else {
        setTournament(null);
        setPageError(data?.message || 'Failed to fetch tournament details.');
      }
    } catch (err: any) {
      console.error('Error fetching tournament details:', err);
      setTournament(null);
      setPageError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoadingTournament(false);
    }
  }, [tournamentId]);

  const fetchTournamentGames = useCallback(async () => {
    if (!tournamentId) return;
    setLoadingGames(true);
    setPageError(null);
    try {
      const data = await apiClient.get<TournamentGamesApiResponse>(`/api/tournaments/${tournamentId}/games`);
      if (data?.games) {
        setTournamentGames(data.games);
        const flights = [...new Set(data.games.map(g => g.flight).filter(f => f))].sort() as string[];
        setAvailableFlights(flights);
      } else {
        setTournamentGames([]);
        if (data?.message) setPageError(data.message);
      }
    } catch (err: any) {
      console.error('Error fetching tournament games:', err);
      setTournamentGames([]);
      setPageError(err.message || 'Failed to fetch tournament games.');
    } finally {
      setLoadingGames(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    fetchTournamentDetails();
    fetchTournamentGames();
  }, [fetchTournamentDetails, fetchTournamentGames]);

  const fetchAllAvailableGames = async () => {
    if (!isAddGameModalOpen) return; // Only fetch if modal is to be opened
    setLoadingAllGames(true);
    try {
        // Fetch games that are not already in this tournament
        // This might require a more sophisticated API endpoint or client-side filtering
        const response = await apiClient.get<AllGamesApiResponse>('/api/games/list?type=all'); // Fetch all games for now
        if (response?.games) {
            const currentTournamentGameIds = new Set(tournamentGames.map(tg => tg.id));
            setAllAvailableGames(response.games.filter(g => !currentTournamentGameIds.has(g.id)));
        } else {
            setAllAvailableGames([]);
        }
    } catch (error) {
        console.error("Failed to fetch available games", error);
        toast.error("Could not load games list for adding.");
        setAllAvailableGames([]);
    }
    setLoadingAllGames(false);
  };

  const handleOpenAddGameModal = () => {
    setSelectedGameToAdd('');
    setSelectedFlightForNewGame('');
    setIsAddGameModalOpen(true);
    fetchAllAvailableGames(); 
  };

  const handleAddGameToTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tournamentId || !selectedGameToAdd) {
      toast.error('Please select a game.');
      return;
    }
    setLoadingGames(true); // Indicate loading for the main games list
    try {
      const payload = { game_id: selectedGameToAdd, flight: selectedFlightForNewGame || null };
      const response = await apiClient.post<AddGameToTournamentResponse>(`/api/tournaments/${tournamentId}/games`, payload);
      if (response?.tournamentGameEntry) {
        toast.success(response.message || 'Game added to tournament successfully!');
        fetchTournamentGames(); // Refresh list
        setIsAddGameModalOpen(false);
      } else {
        throw new Error(response?.message || 'Failed to add game to tournament.');
      }
    } catch (err: any) {
      console.error('Error adding game to tournament:', err);
      toast.error(err.message || 'An unexpected error occurred.');
    } finally {
      setLoadingGames(false);
    }
  };

  const handleRemoveGameFromTournament = async (gameId: string) => {
    if (!tournamentId || !gameId) return;
    if (!confirm('Are you sure you want to remove this game from the tournament?')) return;
    setLoadingGames(true);
    try {
      const response = await apiClient.delete<RemoveGameFromTournamentResponse>(`/api/tournaments/${tournamentId}/games/${gameId}`);
      toast.success(response.message || 'Game removed from tournament successfully!');
      fetchTournamentGames(); // Refresh list
    } catch (err: any) {
      console.error('Error removing game from tournament:', err);
      toast.error(err.response?.data?.message || err.message || 'Failed to remove game.');
    } finally {
      setLoadingGames(false);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) { return 'Invalid Date'; }
  };
  
  const filteredTournamentGames = tournamentGames.filter(game => {
    const gameName = `${game.home_team_name || ''} vs ${game.away_team_name || ''}`.toLowerCase();
    const matchesSearch = !searchTerm || gameName.includes(searchTerm.toLowerCase()) || game.location?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFlight = !flightFilter || game.flight === flightFilter;
    return matchesSearch && matchesFlight;
  });

  if (loadingTournament) {
    return (
        <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
            <Loader2 size={48} className="animate-spin text-blue-500" />
            <p className={`ml-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Loading tournament details...</p>
        </div>
    );
  }

  if (pageError && !tournament) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-4 ${isDarkMode ? 'bg-gray-900 text-red-400' : 'bg-gray-100 text-red-600'}`}>
        <AlertTriangle size={48} className="mb-4" />
        <h2 className="text-xl font-semibold mb-2">Error Loading Tournament</h2>
        <p className="text-center">{pageError}</p>
        <button 
          onClick={() => router.reload()} 
          className={`mt-6 px-4 py-2 rounded-md font-medium transition-colors ${isDarkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}>
          Try Again
        </button>
      </div>
    );
  }

  if (!tournament) {
    return (
        <div className={`min-h-screen flex flex-col items-center justify-center p-4 ${isDarkMode ? 'bg-gray-900 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
            <Info size={48} className="mb-4" />
            <h2 className="text-xl font-semibold">Tournament Not Found</h2>
            <p>The tournament details could not be loaded or the tournament does not exist.</p>
        </div>
    );
  }

  return (
    <div className={`min-h-screen p-4 md:p-8 ${isDarkMode ? 'bg-gray-900 text-gray-200' : 'bg-gray-100 text-gray-800'}`}>
      <div className="max-w-5xl mx-auto">
        <Link href="/admin/tournaments" legacyBehavior>
          <a className={`inline-flex items-center mb-6 text-sm ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'}`}>
            <ChevronLeft size={18} className="mr-1" /> Back to Tournaments List
          </a>
        </Link>
        
        <div className={`p-6 rounded-lg shadow-lg mb-8 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex flex-col sm:flex-row justify-between items-start">
            <div>
                <h1 className="text-3xl font-bold mb-1">{tournament.name}</h1>
                {tournament.description && <p className={`text-sm mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{tournament.description}</p>}
            </div>
            {canManageTournament && (
                <Link href={`/admin/tournaments/edit/${tournament.id}`} legacyBehavior>
                    <a className={`mt-3 sm:mt-0 px-4 py-2 text-sm rounded-md font-medium flex items-center transition-colors ${isDarkMode ? 'bg-yellow-500 hover:bg-yellow-400 text-gray-900' : 'bg-yellow-400 hover:bg-yellow-500 text-gray-800'}`}>
                        <Edit2 size={16} className="mr-2"/> Edit Tournament
                    </a>
                </Link>
            )}
          </div>
          <div className={`flex items-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mt-2 mb-1`}>
            <CalendarDays size={16} className="mr-2" />
            {formatDate(tournament.start_date)} - {formatDate(tournament.end_date)}
          </div>
          {tournament.location && (
            <div className={`flex items-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <MapPin size={16} className="mr-2" />
              {tournament.location}
            </div>
          )}
          {tournament.status && <p className={`text-xs mt-2 capitalize ${isDarkMode? 'text-gray-300': 'text-gray-700'}`}>Status: <span className={`font-semibold px-1.5 py-0.5 rounded-full ${isDarkMode?'bg-blue-700':'bg-blue-200'}`}>{tournament.status}</span></p>}
        </div>

        {pageError && <p className={`mb-4 text-red-500 p-3 rounded ${isDarkMode ? 'bg-red-800' : 'bg-red-100'}`}>{pageError}</p>}

        <div className={`p-6 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex flex-col md:flex-row justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold flex items-center">
                    <Users size={24} className="mr-2"/> Tournament Games ({filteredTournamentGames.length})
                </h2>
                {canManageTournament && (
                    <button 
                        onClick={handleOpenAddGameModal}
                        className={`mt-3 md:mt-0 px-4 py-2 text-sm rounded-md font-medium flex items-center transition-colors ${isDarkMode ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}
                    >
                        <PlusCircle size={18} className="mr-2"/> Add Game to Tournament
                    </button>
                )}
            </div>

            {/* Filters for games */} 
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="relative">
                    <input 
                        type="text"
                        placeholder="Search games (team names, location)..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full pl-10 pr-3 py-2 rounded-md border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300'} focus:ring-blue-500 focus:border-transparent`}
                    />
                    <Search size={18} className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                </div>
                <div>
                    <select
                        value={flightFilter}
                        onChange={(e) => setFlightFilter(e.target.value)}
                        className={`w-full px-3 py-2 rounded-md border ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} focus:ring-blue-500 focus:border-transparent`}
                    >
                        <option value="">All Flights</option>
                        {availableFlights.map(flight => (
                            <option key={flight} value={flight}>{flight}</option>
                        ))}
                    </select>
                </div>
            </div>

            {loadingGames && <div className="flex justify-center items-center py-8"><Loader2 size={32} className="animate-spin text-blue-500" /><p className="ml-2">Loading games...</p></div>}
            {!loadingGames && tournamentGames.length === 0 && <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>No games have been added to this tournament yet.</p>}
            {!loadingGames && tournamentGames.length > 0 && filteredTournamentGames.length === 0 && <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>No games match your current filters.</p>}
            
            {!loadingGames && filteredTournamentGames.length > 0 && (
                <ul className="space-y-3">
                {filteredTournamentGames.map((game) => (
                    <li key={game.id} className={`p-3 rounded-md flex flex-col sm:flex-row justify-between items-start transition-all ${isDarkMode ? 'bg-gray-700 hover:bg-gray-650' : 'bg-gray-50 hover:bg-gray-100'}`}>
                        <div className="flex-grow mb-2 sm:mb-0">
                            <Link href={`/games/${game.id}`} legacyBehavior>
                                <a className="font-medium hover:underline">{game.home_team_name || 'TBD'} vs {game.away_team_name || 'TBD'}</a>
                            </Link>
                            {game.flight && <span className={`text-xs ml-2 px-1.5 py-0.5 rounded ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>Flight: {game.flight}</span>}
                            <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {formatDate(game.game_date)} at {game.start_time || 'TBD'}
                                {game.location && ` - ${game.location}`}
                            </p>
                             {game.status && <p className={`text-xs mt-0.5 capitalize ${isDarkMode?'text-gray-300':'text-gray-700'}`}>Status: <span className={`font-semibold px-1 py-0.5 text-[10px] rounded-full ${game.status === 'completed' ? (isDarkMode?'bg-green-700 text-green-200':'bg-green-200 text-green-800') : (isDarkMode?'bg-yellow-700 text-yellow-200':'bg-yellow-200 text-yellow-800')}`}>{game.status}</span></p>}
                            {game.score_home !== null && game.score_away !== null && (
                                <p className={`text-xs font-semibold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>Score: {game.score_home} - {game.score_away}</p>
                            )}
                        </div>
                        {canManageTournament && (
                            <div className="flex items-center space-x-2 flex-shrink-0">
                                <button 
                                    onClick={() => router.push(`/admin/games/edit/${game.id}?tournamentId=${tournamentId}`)} 
                                    className={`p-1.5 rounded hover:bg-opacity-20 ${isDarkMode ? 'text-yellow-300 hover:bg-yellow-400' : 'text-yellow-500 hover:bg-yellow-600'}`} 
                                    title="Edit Game Details">
                                    <Edit2 size={16}/>
                                </button>
                                <button 
                                    onClick={() => handleRemoveGameFromTournament(game.id)} 
                                    className={`p-1.5 rounded hover:bg-opacity-20 ${isDarkMode ? 'text-red-400 hover:bg-red-500' : 'text-red-500 hover:bg-red-600'}`} 
                                    title="Remove Game From Tournament">
                                    <Trash2 size={16}/>
                                </button>
                            </div>
                        )}
                    </li>
                ))}
                </ul>
            )}
        </div>

        {/* Add Game to Tournament Modal */} 
        {isAddGameModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className={`p-6 rounded-lg shadow-xl w-full max-w-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                    <h3 className="text-xl font-semibold mb-4">Add Game to {tournament.name}</h3>
                    {loadingAllGames && <div className="flex items-center justify-center py-4"><Loader2 size={24} className="animate-spin text-blue-500"/><p className="ml-2">Loading available games...</p></div>}
                    {!loadingAllGames && allAvailableGames.length === 0 && (
                        <p className={`${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>All existing games are already part of this tournament, or no other games found. You can <Link href="/admin/games/create" passHref><a className="underline">create a new game</a></Link> first.</p>
                    )}
                    {!loadingAllGames && allAvailableGames.length > 0 && (
                        <form onSubmit={handleAddGameToTournament} className="space-y-4">
                            <div>
                                <label htmlFor="game-select" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Select Game <span className="text-red-500">*</span></label>
                                <select 
                                    id="game-select" 
                                    value={selectedGameToAdd}
                                    onChange={(e) => setSelectedGameToAdd(e.target.value)}
                                    required
                                    className={`w-full px-3 py-2 rounded-md border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'border-gray-300'} focus:ring-blue-500 focus:border-blue-500`}
                                >
                                    <option value="">-- Select a Game --</option>
                                    {allAvailableGames.map(game => (
                                        <option key={game.id} value={game.id}>
                                            {formatDate(game.game_date)}: {game.home_team_name || 'TBD'} vs {game.away_team_name || 'TBD'} ({game.type})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="flight-input" className={`block text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Flight (Optional)</label>
                                <input 
                                    id="flight-input"
                                    type="text"
                                    value={selectedFlightForNewGame}
                                    onChange={(e) => setSelectedFlightForNewGame(e.target.value)}
                                    placeholder="E.g., Gold, Group A"
                                    className={`w-full px-3 py-2 rounded-md border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'border-gray-300'} focus:ring-blue-500 focus:border-blue-500`}
                                />
                            </div>
                            <div className="flex justify-end space-x-3 pt-2">
                                <button 
                                    type="button"
                                    onClick={() => setIsAddGameModalOpen(false)}
                                    className={`px-4 py-2 text-sm rounded-md font-medium transition-colors ${isDarkMode ? 'bg-gray-600 hover:bg-gray-500 text-gray-200' : 'bg-gray-200 hover:bg-gray-300 text-gray-700'}`}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    disabled={loadingGames || !selectedGameToAdd}
                                    className={`px-4 py-2 text-sm rounded-md font-medium flex items-center transition-colors ${isDarkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'} disabled:opacity-50`}
                                >
                                    {loadingGames ? <Loader2 size={18} className="animate-spin mr-2"/> : <PlusCircle size={18} className="mr-2"/>}
                                    Add Game
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        )}
      </div>
    </div>
  );
}

export default withAuth(TournamentPage, {
  teamId: 'any', // Access to a specific tournament might be role-based or public
  roles: ['admin', 'coach', 'manager', 'player', 'parent'] as TeamRole[], // Define who can see tournament pages
  requireRole: false, // Or true, if it should be restricted
}, 'Tournament Details'); 