import { useEffect, useState } from 'react';
import styled from 'styled-components';
import { customFetch } from '../utils';
import { AxiosError } from 'axios';
import { ActionFunctionArgs, Form, Link, redirect } from 'react-router-dom';
import { toast } from 'react-toastify';

const Container = styled.section`
  height: 100vh;
  width: 100%;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: linear-gradient(135deg, #000, #111);
`;

const Title = styled.h2`
  font-family: 'Press Start 2P', cursive;
  font-size: 2rem;
  margin-bottom: 2rem;
`;

const MatchList = styled.ul`
  list-style: none;
  padding: 0;
`;

const MatchItem = styled.li`
  padding: 1rem;
  margin: 1rem 0;
  background: #222;
  border-radius: 8px;
  text-align: center;
`;

const NoMatches = styled.div`
  margin-top: 2rem;
  color: #ccc;
  font-size: 1.2rem;
`;

interface MatchLobby {
  id: number;
  creator_id: string;
  player_count: number;
}

const GameLobby: React.FC = () => {
  // 1) state for your matches & loading
  const [matches, setMatches] = useState<MatchLobby[]>([]);
  const [loading, setLoading] = useState(true);

  // 2) fetch on mount
  useEffect(() => {
    const loadMatches = async () => {
      try {
        const response = await customFetch.get<MatchLobby[]>('/matchmaking/list');
        console.log(response)
        setMatches(response.data);
      } catch (err: unknown) {
        let msg = 'Failed to load matches';
        if (err instanceof AxiosError && err.message) msg = err.message;
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    };

    loadMatches();
  }, []); // empty deps = run once on mount

  if (loading) return <div>Loading matches...</div>;

  return (
    <Container>
      <Title>Open Matches</Title>
      <MatchList>
        {matches.length === 0 ? (
          <NoMatches>No matches found</NoMatches>
        ) : (
          matches.map((match) => (
            <MatchItem key={match.id}>
              Match #{match.id} — Players: {match.player_count}
            </MatchItem>
          ))
        )}
      </MatchList>
    </Container>
  );
};

export default GameLobby;