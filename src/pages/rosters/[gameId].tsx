import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';

interface Player {
  id: string;
  name: string;
  position: string;
  jersey_number: number;
}

interface RosterEntry {
  id: string;
  player_id: string;
  game_id: string;
  is_starter: boolean;
  is_attending: boolean;
  notes: string;
}

export default function GameRosterPage() {
  const router = useRouter();
  const { gameId } = router.query;
  const [players, setPlayers] = useState<Player[]>([]);
  const [rosterEntries, setRosterEntries] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [gameDetails, setGameDetails] = useState<any>(null);

  useEffect(() => {
    if (gameId) {
      fetchGameDetails();
      fetchPlayers();
      fetchRoster();
    }
  }, [gameId]);

  const fetchGameDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single();

      if (error) throw error;
      setGameDetails(data);
    } catch (error) {
      console.error('Error fetching game details:', error);
    }
  };

  const fetchPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('name');

      if (error) throw error;
      setPlayers(data || []);
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };

  const fetchRoster = async () => {
    try {
      const { data, error } = await supabase
        .from('roster_entries')
        .select('*')
        .eq('game_id', gameId);

      if (error) throw error;
      setRosterEntries(data || []);
    } catch (error) {
      console.error('Error fetching roster:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateRosterEntry = async (playerId: string, updates: Partial<RosterEntry>) => {
    try {
      const existingEntry = rosterEntries.find(entry => entry.player_id === playerId);
      
      if (existingEntry) {
        const { error } = await supabase
          .from('roster_entries')
          .update(updates)
          .eq('id', existingEntry.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('roster_entries')
          .insert([{
            player_id: playerId,
            game_id: gameId,
            ...updates
          }]);

        if (error) throw error;
      }

      fetchRoster();
    } catch (error) {
      console.error('Error updating roster entry:', error);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-8">
    </div>
  );
} 