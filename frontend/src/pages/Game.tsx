import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styled from 'styled-components';
import { toast } from 'react-toastify';
import {
  createGameRendererAdapter,
  GameRendererType,
} from '../utils/GameRendererAdapter';

const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;

const GameContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-height: 100vh;
  padding: 2rem;
  color: white;
`;

const GameForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
  width: 100%;
  max-width: 400px;
`;

const InputGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Input = styled.input`
  padding: 0.5rem;
  border: 2px solid #444;
  background: rgba(20, 20, 20, 0.8);
  color: white;
  font-family: 'Press Start 2P', cursive;
  font-size: 0.8rem;
`;

const Button = styled.button`
  padding: 1rem;
  background-color: rgba(30, 30, 30, 0.8);
  border: 2px solid #444;
  color: white;
  font-family: 'Press Start 2P', cursive;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    background-color: rgba(50, 50, 50, 0.8);
    border-color: #00ffaa;
  }
`;

const GameCanvas = styled.canvas`
  border: 2px solid white;
  margin-top: 1rem;
`;

// New styled components for share link
const ShareableLink = styled.div`
  margin: 1rem 0;
  padding: 1rem;
  background-color: rgba(0, 0, 0, 0.4);
  border: 1px solid #444;
  border-radius: 4px;
  width: 100%;
  max-width: 600px;
`;

const LinkDisplay = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
`;

const LinkText = styled.input`
  flex: 1;
  padding: 0.5rem;
  background: rgba(30, 30, 30, 0.7);
  border: 1px solid #555;
  color: #00ffaa;
  font-family: monospace;
  border-radius: 4px;
`;

const CopyButton = styled.button`
  padding: 0.5rem 1rem;
  background: #222;
  color: white;
  border: 1px solid #555;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;

  &:hover {
    background: #333;
    border-color: #00ffaa;
  }
`;


const Game = () => {
  const [player1Id, setPlayer1Id] = useState('');
  const [player2Id, setPlayer2Id] = useState('');
  const [gameCreated, setGameCreated] = useState(false);
  const [gameId, setGameId] = useState<number | null>(null);
  const [shareableLink, setShareableLink] = useState(''); // New state for shareable link
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<GameRendererType | null>(null);
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  // Check if game_id and token are in URL parameters
  useEffect(() => {
    const gameIdParam = searchParams.get('game_id');

    if (gameIdParam) {
      setGameId(Number(gameIdParam));
      setGameCreated(true);
    }
  }, [searchParams]);

  // Initialize the game when gameId is available
  useEffect(() => {
    if (!gameId || !canvasRef.current || !user?.authToken) return;

    // Store event handlers as named functions for cleanup
    const keyDownHandler = (e: KeyboardEvent) => {
      if (!rendererRef.current) return;

      if (e.key === 'ArrowUp') {
        rendererRef.current.controls.up = 1;
      } else if (e.key === 'ArrowDown') {
        rendererRef.current.controls.down = 1;
      }
    };

    const keyUpHandler = (e: KeyboardEvent) => {
      if (!rendererRef.current) return;

      if (e.key === 'ArrowUp') {
        rendererRef.current.controls.up = 0;
      } else if (e.key === 'ArrowDown') {
        rendererRef.current.controls.down = 0;
      }
    };

    // Create the renderer using the adapter
    const renderer = createGameRendererAdapter(
      gameId,
      user.authToken,
      canvasRef.current,
      "multi"
    );

    // Add event listeners
    document.addEventListener('keydown', keyDownHandler);
    document.addEventListener('keyup', keyUpHandler);

    rendererRef.current = renderer;
    renderer.start();

    // Cleanup function
    return () => {
      if (renderer?.socket && renderer.socket.readyState === WebSocket.OPEN) {
        renderer.socket.close();
      }

      // Remove event listeners
      document.removeEventListener('keydown', keyDownHandler);
      document.removeEventListener('keyup', keyUpHandler);

      rendererRef.current = null;
    };
  }, [gameId, user?.authToken]);

  // Handle game creation
  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!player1Id || !player2Id || !user?.authToken) return;

    try {
      const response = await fetch('http://localhost:8888/game/new-multiplayer', {
      // const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8888';
      // const response = await fetch(`${apiUrl}/game/new`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.authToken}`,
        },
        body: JSON.stringify({
          player1_id: parseInt(player1Id),
          player2_id: parseInt(player2Id),
        }),
      });

      const data = await response.json();
      if (data.id) {
        setGameId(data.id);
        setGameCreated(true);

        // Generate shareable link for the second player
        const baseUrl = window.location.origin;
        const shareLink = `${baseUrl}/game?game_id=${data.id}`;
        setShareableLink(shareLink);

        // Update URL with game_id without refreshing the page
        const url = new URL(window.location.href);
        url.searchParams.set('game_id', data.id.toString());
        window.history.pushState({}, '', url.toString());
      }
    } catch (error) {
      console.error('Failed to create game:', error);
    }
  };

  return (
    <GameContainer>
      <canvas
        id='game-canvas'
        style={{ display: 'none' }}
        width={1}
        height={1}
      />
      <h1>Pong Game</h1>

      {!gameCreated ? (
        <GameForm onSubmit={handleCreateGame}>
          <InputGroup>
            <label htmlFor='player1'>Player 1 ID</label>
            <Input
              id='player1'
              type='number'
              value={player1Id}
              onChange={(e) => setPlayer1Id(e.target.value)}
              required
            />
          </InputGroup>

          <InputGroup>
            <label htmlFor='player2'>Player 2 ID</label>
            <Input
              id='player2'
              type='number'
              value={player2Id}
              onChange={(e) => setPlayer2Id(e.target.value)}
              required
            />
          </InputGroup>

          <Button type='submit'>Create Game</Button>
        </GameForm>
      ) : (
        <>
          <p>Game ID: {gameId}</p>

          {/* New share link section */}
          {shareableLink && (
            <ShareableLink>
              <h3>Share with Player 2</h3>
              <p>Send this link to the second player:</p>
              <LinkDisplay>
                <LinkText
                  value={shareableLink}
                  readOnly
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <CopyButton
                  onClick={() => {
                    navigator.clipboard.writeText(shareableLink);
                    toast.success('Link copied to clipboard!');
                  }}
                >
                  Copy
                </CopyButton>
              </LinkDisplay>
              <p>Player 2 needs to be logged in to join the game</p>
            </ShareableLink>
          )}

          <p>Press UP and DOWN arrows to confirm and control your paddle</p>
          <GameCanvas
            ref={canvasRef}
            width={DEFAULT_WIDTH}
            height={DEFAULT_HEIGHT}
          />
        </>
      )}
    </GameContainer>
  );
};

export default Game;
