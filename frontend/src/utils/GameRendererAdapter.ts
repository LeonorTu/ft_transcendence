import { GameRenderer } from '../../../Game/render.js';

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
  gameId: number,
  authToken: string,
  canvasElement: HTMLCanvasElement
): GameRendererType {
  // Create an instance of the original GameRenderer
  const renderer = new GameRenderer(
    'localhost',
    8888,
    gameId,
    authToken,
    document
  );

  // Set the canvas element
  renderer.canvas = canvasElement;

  const ctx = canvasElement.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D rendering context');
  }
  renderer.ctx = ctx;

  return renderer;
}
