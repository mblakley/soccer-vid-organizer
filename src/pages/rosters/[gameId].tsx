import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">
          Game Roster: {gameDetails?.home_team} vs {gameDetails?.away_team}
        </h1>
        <button 
          onClick={() => router.back()}
          className="inline-flex items-center px-4 py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700"
        >
          Back to Games
        </button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Player Roster</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {players.map((player) => {
              const rosterEntry = rosterEntries.find(entry => entry.player_id === player.id);
              return (
                <div key={player.id} className="flex items-center gap-4 p-4 border rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-semibold">{player.name}</h3>
                    <p className="text-sm text-gray-500">
                      {player.position} - #{player.jersey_number}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`starter-${player.id}`}
                        checked={rosterEntry?.is_starter || false}
                        onCheckedChange={(checked) => {
                          updateRosterEntry(player.id, { is_starter: checked as boolean });
                        }}
                      />
                      <Label htmlFor={`starter-${player.id}`}>Starter</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`attending-${player.id}`}
                        checked={rosterEntry?.is_attending || false}
                        onCheckedChange={(checked) => {
                          updateRosterEntry(player.id, { is_attending: checked as boolean });
                        }}
                      />
                      <Label htmlFor={`attending-${player.id}`}>Attending</Label>
                    </div>
                    <Input
                      placeholder="Notes"
                      value={rosterEntry?.notes || ''}
                      onChange={(e) => {
                        updateRosterEntry(player.id, { notes: e.target.value });
                      }}
                      className="w-48"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 