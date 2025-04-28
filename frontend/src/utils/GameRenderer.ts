
export const MessageType = {
  JOIN: 'join',
  CONTROL_INPUT: 'input',
  SETTINGS: 'settings',
  STATE: 'state',
};

export const WHITE = '#ffffff';
export const GAME_ENDPOINT = 'game';
export const DEFAULT_WIDTH = 800;
export const DEFAULT_HEIGHT = 600;

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

export const createGameRenderer = (
  gameId: number,
  authToken: string,
  canvasRef: React.RefObject<HTMLCanvasElement>,
  onKeyDown: (e: KeyboardEvent) => void,
  onKeyUp: (e: KeyboardEvent) => void
): GameRendererType | null => {
  if (!canvasRef.current) return null;

  const renderer: GameRendererType = {
    server_uri: 'localhost',
    game_id: gameId,
    user_token: authToken,
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
      document.addEventListener('keydown', onKeyDown);
      document.addEventListener('keyup', onKeyUp);

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

  return renderer;
};
