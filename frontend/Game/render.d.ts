export class GameRenderer {
  constructor(
    server_uri: string,
    server_port: number,
    game_id: number,
    user_token: string,
    document: Document,
    game_type: string,
  );

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

  start(): void;
  updateSettings(settings: any): void;
  drawPaddle1(offset: number): void;
  drawPaddle2(offset: number): void;
  drawBall(ball_state: any): void;
  drawScores(players: any[]): void;
  drawWaitingForPlayers(players: any[]): void;
  drawRemainingTimout(timeout: number): void;
  drawResult(winner: any): void;
  drawCenterLine(): void;
  drawWaitingForConnection(): void;
  renderGame(): void;
  render(): void;
  updatePaddles(): void;
  waitForConnection(): void;
}
