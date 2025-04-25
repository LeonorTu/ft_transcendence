import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styled from 'styled-components';
import { toast } from 'react-toastify';

// Game constants
const MessageType = {
  JOIN: 'join',
  CONTROL_INPUT: 'input',
  SETTINGS: 'settings',
  STATE: 'state',
};

const WHITE = '#ffffff';
const GAME_ENDPOINT = 'game';
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

interface GameRendererType {
  server_uri: string;
  game_id: number;
  user_token: string;
  socket: WebSocket;
  connected: boolean;
  state: any;
  controls: { up: number; down: number };
  document: Document;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  paddle_height: number;
  paddle_width: number;
  paddle_margin: number;
  paddle_start: number;
  ball_radius: number;
  board_width: number;
  board_height: number;
  start: () => void;
  updateSettings: (settings: any) => void;
  drawPaddle1: (offset: number) => void;
  drawPaddle2: (offset: number) => void;
  drawBall: (ball_state: any) => void;
  drawScores: (players: any[]) => void;
  drawWaitingForPlayers: (players: any[]) => void;
  drawRemainingTimout: (timeout: number) => void;
  drawResult: (winner: any) => void;
  drawCenterLine: () => void;
  drawWaitingForConnection: () => void;
  renderGame: () => void;
  render: () => void;
  updatePaddles: () => void;
  waitForConnection: () => void;
}

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

    // Create the renderer object using an object literal
    const renderer: GameRendererType = {
      server_uri: 'localhost',
      game_id: gameId,
      user_token: user.authToken,
      socket: new WebSocket(`ws://localhost:8888/${GAME_ENDPOINT}`),
      connected: false,
      state: null,
      controls: { up: 0, down: 0 },
      document,
      canvas: canvasRef.current,
      ctx: canvasRef.current.getContext('2d')!,
      paddle_height: 0,
      paddle_width: 0,
      paddle_margin: 0,
      paddle_start: 0,
      ball_radius: 0,
      board_width: DEFAULT_WIDTH,
      board_height: DEFAULT_HEIGHT,

      start() {
        // Set default canvas dimensions
        this.canvas.setAttribute('height', String(this.board_height));
        this.canvas.setAttribute('width', String(this.board_width));

        // Add event listeners
        document.addEventListener('keydown', keyDownHandler);
        document.addEventListener('keyup', keyUpHandler);

        this.socket.addEventListener('open', () => {
          this.socket.send(
            JSON.stringify({
              type: MessageType.JOIN,
              payload: {
                token: this.user_token,
                game_id: this.game_id,
              },
            })
          );
          this.connected = true;
        });

        this.socket.addEventListener('message', (event) => {
          const { type, payload } = JSON.parse(event.data);
          if (type === MessageType.SETTINGS) {
            this.updateSettings(payload);
          } else if (type === MessageType.STATE) {
            this.state = payload;
          }
        });

        this.socket.addEventListener('error', (e) => {
          console.error('WS Error:', e);
        });

        this.socket.addEventListener('close', (e) => {
          console.warn(`WebSocket closed: (${e.code}: ${e.reason})`);
        });

        setInterval(this.render.bind(this), 10);
        this.waitForConnection();
      },

      updateSettings(settings) {
        this.canvas.setAttribute('height', String(settings.board_height));
        this.canvas.setAttribute('width', String(settings.board_width));
        this.board_width = settings.board_width;
        this.board_height = settings.board_height;
        this.paddle_height = settings.paddle_height;
        this.paddle_width = settings.paddle_width;
        this.paddle_margin = settings.paddle_to_wall_dist;
        this.paddle_start = this.canvas.height / 2 - this.paddle_height / 2;
        this.ball_radius = settings.ball_radius;
      },

      drawPaddle1(offset) {
        this.ctx.fillStyle = WHITE;
        this.ctx.fillRect(
          this.paddle_margin,
          this.paddle_start + offset,
          this.paddle_width,
          this.paddle_height
        );
      },

      drawPaddle2(offset) {
        this.ctx.fillStyle = WHITE;
        this.ctx.fillRect(
          this.canvas.width - this.paddle_margin - this.paddle_width,
          this.paddle_start + offset,
          this.paddle_width,
          this.paddle_height
        );
      },

      drawBall(ball_state) {
        this.ctx.fillStyle = WHITE;
        this.ctx.beginPath();
        this.ctx.arc(
          ball_state.x,
          ball_state.y,
          this.ball_radius,
          0,
          Math.PI * 2,
          true
        );
        this.ctx.fill();
      },

      drawScores(players) {
        this.ctx.fillStyle = WHITE;
        this.ctx.font = '48px serif';
        this.ctx.fillText(players[0].score, this.board_width / 4, 50);
        this.ctx.fillText(players[1].score, this.board_width * (3 / 4), 50);
      },

      drawWaitingForPlayers(players) {
        this.ctx.fillStyle = WHITE;
        this.ctx.font = '40px serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
          'Waiting for players',
          this.board_width / 2,
          this.board_height / 2
        );

        this.ctx.font = '20px serif';
        this.ctx.fillText(
          'Press UP and DOWN to confirm',
          this.board_width / 2,
          this.board_height / 2 + 30
        );

        this.ctx.font = '30px serif';
        if (players[0].ready) {
          this.ctx.fillText(
            'Player 1 READY',
            this.board_width / 4,
            this.board_height * 0.75
          );
        } else {
          this.ctx.fillText(
            'Waiting for Player 1',
            this.board_width / 4,
            this.board_height * 0.75
          );
        }

        if (players[1].ready) {
          this.ctx.fillText(
            'Player 2 READY',
            this.board_width * 0.75,
            this.board_height * 0.75
          );
        } else {
          this.ctx.fillText(
            'Waiting for Player 2',
            this.board_width * 0.75,
            this.board_height * 0.75
          );
        }
      },

      drawRemainingTimout(timeout) {
        this.ctx.fillStyle = WHITE;
        this.ctx.font = '40px serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
          `Resetting in ${timeout}...`,
          this.board_width / 2,
          this.board_height / 2
        );
      },

      drawResult(winner) {
        this.ctx.fillStyle = WHITE;
        this.ctx.font = '40px serif';
        this.ctx.textAlign = 'center';
        let text;
        if (winner == null) {
          text = 'The game is a tie';
        } else {
          text = `Player ${winner.id} won the game`;
        }
        this.ctx.fillText(text, this.board_width / 2, this.board_height / 2);
      },

      drawCenterLine() {
        this.ctx.setLineDash([10, 10]);
        this.ctx.strokeStyle = WHITE;
        this.ctx.lineWidth = this.paddle_width / 2;
        this.ctx.beginPath();
        this.ctx.moveTo(this.canvas.width / 2, 0);
        this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        this.ctx.stroke();
      },

      drawWaitingForConnection() {
        this.ctx.fillStyle = WHITE;
        this.ctx.font = '40px serif';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
          'Waiting for connection...',
          this.board_width / 2,
          this.board_height / 2
        );
      },

      renderGame() {
        this.drawScores(this.state.players);
        if (this.state.game_state === 'not_started') {
          this.drawWaitingForPlayers(this.state.players);
        } else if (this.state.game_state === 'active') {
          this.drawCenterLine();
          this.drawPaddle1(this.state.objects.left_paddle.y_offset);
          this.drawPaddle2(this.state.objects.right_paddle.y_offset);
          this.drawBall(this.state.objects.ball);
        } else if (this.state.game_state === 'resetting') {
          this.drawRemainingTimout(this.state.remaining_timeout);
        } else if (this.state.game_state === 'finished') {
          this.drawResult(this.state.winner);
        }
      },

      render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (!this.connected || !this.state) {
          this.drawWaitingForConnection();
        } else {
          this.renderGame();
        }
      },

      updatePaddles() {
        if (this.controls.up === 1 && this.controls.down === 0) {
          this.socket.send(
            JSON.stringify({
              type: MessageType.CONTROL_INPUT,
              payload: { input: 'up' },
            })
          );
        } else if (this.controls.up === 0 && this.controls.down === 1) {
          this.socket.send(
            JSON.stringify({
              type: MessageType.CONTROL_INPUT,
              payload: { input: 'down' },
            })
          );
        }
      },

      waitForConnection() {
        if (this.connected) {
          setInterval(this.updatePaddles.bind(this), 10);
        } else {
          setTimeout(this.waitForConnection.bind(this), 100);
        }
      },
    };

    // Store the renderer for cleanup
    rendererRef.current = renderer;
    renderer.start();

    // Cleanup function
    return () => {
      if (renderer.socket && renderer.socket.readyState === WebSocket.OPEN) {
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
      const response = await fetch('http://localhost:8888/game/new', {
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
