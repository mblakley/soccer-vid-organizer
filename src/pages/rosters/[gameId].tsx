'use client'
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
// import { supabase } from '@/lib/supabaseClient'; // Will be removed
import { apiClient } from '@/lib/api/client';
import { Game } from '@/lib/types/games';
import { Player, RosterEntry } from '@/lib/types/players';
import { withAuth } from '@/components/auth';
import { useTheme } from '@/contexts/ThemeContext';
import { CheckCircle, XCircle, Edit3, HelpCircle, Users, ShieldCheck, CalendarDays, MapPin, PlusCircle } from 'lucide-react';

// Define API response types expected by the component
interface GameDetailsApiResponse {
  game?: Game;
  message?: string;
}

interface ListPlayersApiResponse {
  players?: Player[];
  message?: string;
}

interface ListRosterEntriesApiResponse {
  rosterEntries?: (RosterEntry & { player?: Player })[];
  message?: string;
}

interface UpdateRosterResponse {
  rosterEntry?: RosterEntry;
  message?: string;
}

// Type for roster entries that includes player details for easier rendering
type RosterEntryWithPlayer = RosterEntry & { player?: Player };

function GameRosterPage() {
  const router = useRouter();
  const { gameId } = router.query as { gameId?: string };
  const { isDarkMode } = useTheme();

  const [gameDetails, setGameDetails] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [rosterEntries, setRosterEntries] = useState<RosterEntryWithPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGameDetails = useCallback(async () => {
    if (!gameId) return;
    try {
      const data = await apiClient.get<GameDetailsApiResponse>(`/api/games/${gameId}`);
      if (data?.game) {
        setGameDetails(data.game);
      } else {
        setError(data?.message || 'Failed to fetch game details.');
      }
    } catch (err: any) {
      console.error('Error fetching game details:', err);
      setError(err.message || 'An unexpected error occurred.');
    }
  }, [gameId]);

  const fetchPlayers = useCallback(async () => {
    // TODO: Potentially filter players by team if gameDetails includes team_id
    try {
      const data = await apiClient.get<ListPlayersApiResponse>('/api/players/list');
      if (data?.players) {
        setPlayers(data.players);
      } else {
        setError(data?.message || 'Failed to fetch players.');
      }
    } catch (err: any) {
      console.error('Error fetching players:', err);
      setError(err.message || 'An unexpected error occurred.');
    }
  }, []);

  const fetchRoster = useCallback(async () => {
    if (!gameId) return;
    try {
      const data = await apiClient.get<ListRosterEntriesApiResponse>(`/api/rosters/list?gameId=${gameId}`);
      if (data?.rosterEntries) {
        setRosterEntries(data.rosterEntries);
      } else {
        setError(data?.message || 'Failed to fetch roster.');
      }
    } catch (err: any) {
      console.error('Error fetching roster:', err);
      setError(err.message || 'An unexpected error occurred.');
    }
  }, [gameId]);

  useEffect(() => {
    if (gameId) {
      setLoading(true);
      setError(null);
      Promise.all([fetchGameDetails(), fetchPlayers(), fetchRoster()])
        .catch(err => {
            console.error("Error during initial data fetch:", err);
            setError("Failed to load all necessary data.");
        })
        .finally(() => {
            setLoading(false);
        });
    }
  }, [gameId, fetchGameDetails, fetchPlayers, fetchRoster]);

  const handleRosterUpdate = async (playerId: string, updates: Partial<RosterEntry>) => {
    if (!gameId) return;

    const existingEntry = rosterEntries.find(entry => entry.player_id === playerId);
    const payload: Partial<RosterEntry> & { game_id: string, player_id: string } = {
      ...updates,
      game_id: gameId,
      player_id: playerId,
    };
    if (existingEntry?.id) {
      payload.id = existingEntry.id;
    }

    try {
      const response = await apiClient.post<UpdateRosterResponse>('/api/rosters/update', payload);
      if (response?.rosterEntry) {
        fetchRoster(); // Refresh roster list
      } else {
        setError(response?.message || 'Failed to update roster entry.');
      }
    } catch (err: any) {
      console.error('Error updating roster entry:', err);
      setError(err.message || 'An unexpected error occurred while updating roster.');
    }
  };

  // Helper to get player name from ID, falling back to player_id if not found
  const getPlayerName = (playerId: string): string => {
    const player = players.find(p => p.id === playerId);
    return player?.name || playerId;
  };
  
  // Helper to get player details for display
  const getPlayerForRosterEntry = (entry: RosterEntryWithPlayer): Player | undefined => {
    // If player data is already joined in rosterEntries from API (ideal)
    if (entry.player) return entry.player;
    // Fallback: find in the separate players list
    return players.find(p => p.id === entry.player_id);
  };

  if (loading && !gameDetails) { // Show initial loading state more robustly
    return (
        <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
        </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-4 ${isDarkMode ? 'bg-gray-900 text-red-400' : 'bg-gray-100 text-red-600'}`}>
        <XCircle size={48} className="mb-4" />
        <h2 className="text-xl font-semibold mb-2">Error Loading Roster</h2>
        <p className="text-center">{error}</p>
        <button 
          onClick={() => router.reload()} 
          className={`mt-6 px-4 py-2 rounded-md font-medium transition-colors ${isDarkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}>
          Try Again
        </button>
      </div>
    );
  }

  if (!gameDetails) {
    return (
        <div className={`min-h-screen flex flex-col items-center justify-center p-4 ${isDarkMode ? 'bg-gray-900 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
            <HelpCircle size={48} className="mb-4" />
            <h2 className="text-xl font-semibold">Game Not Found</h2>
            <p>The game details could not be loaded or the game does not exist.</p>
        </div>
    );
  }

  // Players not yet in the roster for this game
  const availablePlayers = players.filter(p => !rosterEntries.some(re => re.player_id === p.id));

  return (
    <div className={`min-h-screen p-4 md:p-8 ${isDarkMode ? 'bg-gray-900 text-gray-200' : 'bg-gray-100 text-gray-800'}`}>
      <div className="max-w-4xl mx-auto">
        <button onClick={() => router.back()} className={`mb-6 text-sm ${isDarkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-500'}`}>&larr; Back to Games</button>
        
        <div className={`p-6 rounded-lg shadow-lg mb-8 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <h1 className="text-3xl font-bold mb-2">
            Roster for {gameDetails.home_team_name || 'Home'} vs {gameDetails.away_team_name || 'Away'}
          </h1>
          <div className={`flex items-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-1`}>
            <CalendarDays size={16} className="mr-2" />
            {new Date(gameDetails.game_date || Date.now()).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at {gameDetails.start_time || 'TBD'}
          </div>
          {gameDetails.location && (
            <div className={`flex items-center text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              <MapPin size={16} className="mr-2" />
              {gameDetails.location}
            </div>
          )}
        </div>

        {error && <p className={`mb-4 text-red-500 p-3 rounded ${isDarkMode ? 'bg-red-800' : 'bg-red-100'}`}>{error}</p>}

        <div className="grid md:grid-cols-2 gap-8">
          {/* Current Roster Section */}
          <div className={`p-6 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
                <Users size={24} className="mr-2"/> Current Roster ({rosterEntries.length})
            </h2>
            {loading && rosterEntries.length === 0 && <p className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>Loading roster...</p>}
            {!loading && rosterEntries.length === 0 && <p className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>No players assigned to this roster yet.</p>}
            <ul className="space-y-3">
              {rosterEntries.map((entry) => {
                const playerDetails = getPlayerForRosterEntry(entry);
                return (
                  <li key={entry.id} className={`p-3 rounded-md flex justify-between items-center transition-all ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'}`}>
                    <div>
                      <span className="font-medium">{playerDetails?.name || entry.player_id}</span>
                      {playerDetails?.jersey_number && <span className={`text-xs ml-2 px-1.5 py-0.5 rounded ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>#{playerDetails.jersey_number}</span>}
                      {playerDetails?.position && <span className={`text-xs ml-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{playerDetails.position}</span>}
                      <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{entry.notes || 'No notes'}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {/* Starter Status - example toggle */}
                      <button 
                        title={entry.is_starter ? "Mark as non-starter" : "Mark as starter"}
                        onClick={() => handleRosterUpdate(entry.player_id, { is_starter: !entry.is_starter })}
                        className={`p-1 rounded-full ${entry.is_starter ? (isDarkMode ? 'text-green-400 hover:text-green-300' : 'text-green-600 hover:text-green-500') : (isDarkMode ? 'text-gray-500 hover:text-gray-400' : 'text-gray-400 hover:text-gray-500')}`}
                        >
                        <ShieldCheck size={18} />
                      </button>
                      {/* Attendance Status - example toggle */}
                      <button 
                        title={entry.is_attending ? "Mark as not attending" : "Mark as attending"}
                        onClick={() => handleRosterUpdate(entry.player_id, { is_attending: !entry.is_attending })}
                        className={`p-1 rounded-full ${entry.is_attending ? (isDarkMode?'text-green-400 hover:text-green-300':'text-green-600 hover:text-green-500') : (isDarkMode?'text-red-400 hover:text-red-300':'text-red-500 hover:text-red-400')}`}
                      >
                        {entry.is_attending ? <CheckCircle size={18} /> : <XCircle size={18} />}
                      </button>
                      {/* TODO: Add Edit Notes Button */}
                      {/* <button className={`p-1 rounded-full ${isDarkMode ? 'text-gray-400 hover:text-blue-400' : 'text-gray-500 hover:text-blue-600'}`}><Edit3 size={18}/></button> */}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Available Players Section */}
          <div className={`p-6 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <h2 className="text-2xl font-semibold mb-4 flex items-center">
                <PlusCircle size={24} className="mr-2"/> Add Players to Roster ({availablePlayers.length})
            </h2>
            {loading && players.length === 0 && <p className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>Loading players...</p>}
            {!loading && players.length === 0 && <p className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>No players available to add. Ensure players are added to the system.</p>}
            {!loading && players.length > 0 && availablePlayers.length === 0 && <p className={isDarkMode ? 'text-gray-500' : 'text-gray-400'}>All available players are already in the roster.</p>}
            <ul className="space-y-2">
              {availablePlayers.map((player) => (
                <li key={player.id} className={`p-3 rounded-md flex justify-between items-center ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div>
                    <span className="font-medium">{player.name}</span>
                    {player.jersey_number && <span className={`text-xs ml-2 px-1.5 py-0.5 rounded ${isDarkMode ? 'bg-gray-600' : 'bg-gray-200'}`}>#{player.jersey_number}</span>}
                    {player.position && <span className={`text-xs ml-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{player.position}</span>}
                  </div>
                  <button 
                    onClick={() => handleRosterUpdate(player.id, { is_attending: true })} // Default to attending when adding
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${isDarkMode ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
                  >
                    Add to Roster
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default withAuth(GameRosterPage, {
    teamId: 'any', // Or dynamically pass gameDetails.team_id if available and relevant for auth rules
    roles: ['coach', 'manager'], // Example: Only coaches/managers can view/edit rosters
    requireRole: true, 
}, 'Game Roster'); 