import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Game {
  id: string;
  home_team: string;
  away_team: string;
  game_date: string;
  game_time: string;
  location: string;
  type: 'league' | 'tournament';
  league_id?: string;
  tournament_id?: string;
  status: 'scheduled' | 'in_progress' | 'completed';
  created_at: string;
}

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [gameType, setGameType] = useState<'all' | 'league' | 'tournament'>('all');
  const router = useRouter();

  useEffect(() => {
    fetchGames();
  }, [gameType]);

  const fetchGames = async () => {
    try {
      let query = supabase
        .from('games')
        .select('*')
        .order('game_date', { ascending: true });

      if (gameType !== 'all') {
        query = query.eq('type', gameType);
      }

      const { data, error } = await query;

      if (error) throw error;
      setGames(data || []);
    } catch (error) {
      console.error('Error fetching games:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Games</h1>
        <div className="flex gap-4">
          <Select
            value={gameType}
            onValueChange={(value: 'all' | 'league' | 'tournament') => setGameType(value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Games</SelectItem>
              <SelectItem value="league">League Games</SelectItem>
              <SelectItem value="tournament">Tournament Games</SelectItem>
            </SelectContent>
          </Select>
          <button 
            onClick={() => router.push('/games/new')}
            className="inline-flex items-center px-4 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
          >
            <PlusCircle className="mr-2 h-4 w-4" />
            New Game
          </button>
        </div>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((game) => (
            <Card key={game.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>{game.home_team} vs {game.away_team}</span>
                  <span className="text-sm font-normal px-2 py-1 rounded-full bg-gray-100">
                    {game.type}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p><strong>Date:</strong> {new Date(game.game_date).toLocaleDateString()}</p>
                  <p><strong>Time:</strong> {game.game_time}</p>
                  <p><strong>Location:</strong> {game.location}</p>
                  <p><strong>Status:</strong> {game.status}</p>
                  <div className="flex gap-2 mt-4">
                    <button
                      className="flex-1 inline-flex items-center justify-center px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                      onClick={() => router.push(`/games/${game.id}`)}
                    >
                      View Details
                    </button>
                    <button
                      className="flex-1 inline-flex items-center justify-center px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                      onClick={() => router.push(`/rosters/${game.id}`)}
                    >
                      Manage Roster
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 