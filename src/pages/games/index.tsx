import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';

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
    </div>
  );
} 