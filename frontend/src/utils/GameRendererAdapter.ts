import { GameRenderer } from '../../Game/render.js';

// Define MessageType enum if you can't import it
enum MessageType {
  JOIN = 'JOIN',
  UPDATE_SETTINGS = 'UPDATE_SETTINGS',
  PADDLE_UPDATE = 'PADDLE_UPDATE',
  GAME_STATE = 'GAME_STATE',
  // Add other message types as needed
}

export interface GameRendererType {
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

export function createGameRendererAdapter(
  game_id: number,
  authToken: string,
  canvasElement: HTMLCanvasElement
): GameRendererType {
  // Get API URL from environment variables and parse it
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8888';
  const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8888';

  // Extract host and port from the URL
  let hostname = 'localhost';
  let port = 8888;

  try {
    // Remove http:// or https:// and parse
    const urlParts = apiUrl.replace(/^https?:\/\//, '').split(':');
    hostname = urlParts[0];
    port = parseInt(urlParts[1], 10);
  } catch (error) {
    console.error('Failed to parse API URL, using defaults:', error);
  }

  const dummyWsUrl = 'ws://dummy';
  // Create an instance of the original GameRenderer with parsed hostname and port
  const renderer = new GameRenderer(
    hostname,
    port,
    game_id,
    authToken,
    document,
    dummyWsUrl
  );
    renderer.socket = new WebSocket(`${wsUrl}/game`);

    // Make sure to send the JOIN message properly when connected
    renderer.socket.addEventListener('open', () => {
      renderer.socket.send(
        JSON.stringify({
          type: MessageType.JOIN,
          payload: {
            token: authToken,
            game_id: game_id,
          },
        })
      );

      // Set connected flag to true when connection is established
      renderer.connected = true;
    });
  // Set the canvas element
  renderer.canvas = canvasElement;

  const ctx = canvasElement.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D rendering context');
  }
  renderer.ctx = ctx;

  return renderer;
}
