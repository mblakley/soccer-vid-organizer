import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface League {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export default function LeaguesPage() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchLeagues();
  }, []);

  const fetchLeagues = async () => {
    try {
      const { data, error } = await supabase
        .from('leagues')
        .select('*')
        .order('name');

      if (error) throw error;
      setLeagues(data || []);
    } catch (error) {
      console.error('Error fetching leagues:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Leagues</h1>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {leagues.map((league) => (
            <Card key={league.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>{league.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-gray-600">{league.description}</p>
                  <button
                    className="w-full mt-4 inline-flex items-center justify-center px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
                    onClick={() => router.push(`/leagues/${league.id}`)}
                  >
                    View Details
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
} 