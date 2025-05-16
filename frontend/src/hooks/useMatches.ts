import { useState, useEffect } from 'react';
import { customFetch } from '../utils';

interface Match {
  id: number;
  opponent: string;
  opponentAvatar: string;
  result: 'win' | 'loss';
  score: string;
  date: string;
}

export const useMatches = (userName?: string) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchMatches = async () => {
      if (!userName) return;

      try {
        setLoading(true);
        const response = await customFetch.get(`/user/${userName}/matches`);
        setMatches(response.data);
      } catch (error) {
        console.error('Error fetching matches:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();

/*     // mock data:
    const mockMatches: Match[] = [
      {
        id: 1,
        opponent: 'player1',
        opponentAvatar: 'https://i.pravatar.cc/150?img=1',
        result: 'win',
        score: '10-8',
        date: '2023-04-15T14:30:00Z',
      },
      {
        id: 2,
        opponent: 'player2',
        opponentAvatar: 'https://i.pravatar.cc/150?img=2',
        result: 'loss',
        score: '5-10',
        date: '2023-04-10T18:45:00Z',
      },
      {
        id: 3,
        opponent: 'player3',
        opponentAvatar: 'https://i.pravatar.cc/150?img=3',
        result: 'win',
        score: '10-7',
        date: '2023-04-05T12:15:00Z',
      },
    ];
    setMatches(mockMatches); */
  }, [userName]);

  // Format date for the match history
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return {
    matches,
    loading,
    formatDate,
  };
};
