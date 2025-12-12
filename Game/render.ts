import '@fontsource/press-start-2p';

enum MessageType {
	JOIN_MULTI = "join_multi",
	JOIN_SINGLE = "join_single",
	CONTROL_INPUT = "input",
	SETTINGS = "settings",
	STATE = "state",
}

export enum GameType {
	SINGLE_PLAYER = "single",
	MULTI_PLAYER = "multi"
}

// colors
const BLACK = "#000000";
const WHITE = "#ffffff";

const GAME_ENDPOINT = "game";

const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;

interface GameSettings {
	board_height: number;
	board_width: number;
	paddle_height: number;
	paddle_width: number;
	paddle_to_wall_dist: number;
	ball_radius: number;
}

interface BallState {
	x: number;
	y: number;
}

interface PaddleState {
	y_offset: number;
}

interface GameObjects {
	left_paddle: PaddleState;
	right_paddle: PaddleState;
	ball: BallState;
}

interface Player {
	username: string;
	score: number;
	ready: boolean;
}

interface GameState {
	game_state: 'not_started' | 'active' | 'resetting' | 'finished' | 'paused';
	players: [Player, Player];
	objects: GameObjects;
	remaining_timeout?: number;
	winner?: Player | null;
}

interface MultiplayerControls {
	up: number;
	down: number;
}

interface SingleplayerControls {
	player1: MultiplayerControls;
	player2: MultiplayerControls;
}

interface WebSocketMessage {
	type: MessageType;
	payload: any;
}

export class GameRenderer {
	private game_id: string;
	private user_token: string;
	private socket: WebSocket;
	private connected: boolean;
	private game_type: string;
	private state: GameState | null;
	private controls: MultiplayerControls | SingleplayerControls;
	private document: Document;
	private canvas: HTMLCanvasElement;
	private ctx: CanvasRenderingContext2D;
	private origin: string[];
	private paddle_height!: number;
	private paddle_width!: number;
	private paddle_margin!: number;
	private paddle_start!: number;
	private ball_radius!: number;
	private board_width: number;
	private board_height: number;

	constructor(
		game_id: string,
		user_token: string,
		document: Document,
		game_type: string,
	) {
		this.game_id = game_id;
		this.user_token = user_token;

		// somewhere in your constants or socket-init file
		const WS_PATH = `/ws/${GAME_ENDPOINT}`;

		// pick the right WS protocol based on page protocol
		const WS_PROTO = location.protocol === 'https:' ? 'wss' : 'ws';

		// Build your socket URL against the same origin
		const WS_URL = `${WS_PROTO}://${location.host}${WS_PATH}`;

		// Usage
		this.socket = new WebSocket(WS_URL);
		this.connected = false;

		// game
		this.game_type = game_type;
		this.state = null;
		if (game_type === GameType.MULTI_PLAYER) {
			this.controls = { up: 0, down: 0 };
		}
		else if (game_type === GameType.SINGLE_PLAYER) {
			this.controls = {
				player1: { up: 0, down: 0 },
				player2: { up: 0, down: 0 }
			};
		}
		else {
			throw new Error(`No such game type: ${game_type}`);
		}

		// window
		this.document = document;
		const canvas = document.getElementById("game-canvas") as HTMLCanvasElement;
		if (!canvas) {
			throw new Error("Canvas element not found");
		}
		this.canvas = canvas;
		const ctx = this.canvas.getContext("2d");
		if (!ctx) {
			throw new Error("Could not get 2D context");
		}
		this.ctx = ctx;
		this.origin = window.location.origin.split(':');

		// game settings
		this.board_width = DEFAULT_WIDTH;
		this.board_height = DEFAULT_HEIGHT;

		// Default settings to keep from resizing if height and width are correct
		this.canvas.setAttribute("height", this.board_height.toString());
		this.canvas.setAttribute("width", this.board_width.toString());
	}

	private multiplayerKeyListener(): void {
		this.document.addEventListener('keydown', (e: KeyboardEvent) => {
			if (e.key === 'ArrowUp') {
				(this.controls as MultiplayerControls).up = 1;
			}
			else if (e.key === 'ArrowDown') {
				(this.controls as MultiplayerControls).down = 1;
			}
		});

		this.document.addEventListener('keyup', (e: KeyboardEvent) => {
			if (e.key === 'ArrowUp') {
				(this.controls as MultiplayerControls).up = 0;
			}
			else if (e.key === 'ArrowDown') {
				(this.controls as MultiplayerControls).down = 0;
			}
		});
	}

	private singleplayerKeyListener(): void {
		this.document.addEventListener('keydown', (e: KeyboardEvent) => {
			if (e.key === 'ArrowUp') {
				(this.controls as SingleplayerControls).player2.up = 1;
			}
			else if (e.key === 'w') {
				(this.controls as SingleplayerControls).player1.up = 1;
			}
			else if (e.key === 'ArrowDown') {
				(this.controls as SingleplayerControls).player2.down = 1;
			}
			else if (e.key === 's') {
				(this.controls as SingleplayerControls).player1.down = 1;
			}
		});

		this.document.addEventListener('keyup', (e: KeyboardEvent) => {
			if (e.key === 'ArrowUp') {
				(this.controls as SingleplayerControls).player2.up = 0;
			}
			else if (e.key === 'w') {
				(this.controls as SingleplayerControls).player1.up = 0;
			}
			else if (e.key === 'ArrowDown') {
				(this.controls as SingleplayerControls).player2.down = 0;
			}
			else if (e.key === 's') {
				(this.controls as SingleplayerControls).player1.down = 0;
			}
		});
	}

	start(): void {
		if (this.game_type === GameType.MULTI_PLAYER) {
			this.multiplayerKeyListener();
		}
		else if (this.game_type === GameType.SINGLE_PLAYER) {
			this.singleplayerKeyListener();
		}

		this.socket.addEventListener('open', () => {
			if (this.game_type === GameType.MULTI_PLAYER) {

				this.socket.send(JSON.stringify({
					type: MessageType.JOIN_MULTI, payload: {
						'token': this.user_token,
						'game_id': this.game_id,
					}
				}));
			}
			else if (this.game_type === GameType.SINGLE_PLAYER) {
				this.socket.send(JSON.stringify({
					type: MessageType.JOIN_SINGLE, payload: {
						'token': this.user_token,
						'game_id': this.game_id,
					}
				}));
			}
			this.connected = true;
		});

		this.socket.addEventListener('message', (event: MessageEvent) => {
			const { type, payload }: WebSocketMessage = JSON.parse(event.data);
			if (type === MessageType.SETTINGS) {
				this.updateSettings(payload);
			}
			else if (type === MessageType.STATE) {
				this.state = payload;
			}
		});

		this.socket.addEventListener('error', (e: Event) => {
			console.error('WS Error:', e);
		});

		this.socket.addEventListener('close', (e: CloseEvent) => {
			console.warn(`WebSocket closed: (${e.code}: ${e.reason})`);
		});

		window.addEventListener('offline', () => {
			console.warn('You lost internet connection');
			this.socket.close(); // Force-close the socket immediately
		});

		setInterval(this.render.bind(this), 10);
		this.waitForConnection();
	}

	private updateSettings(settings: GameSettings): void {
		this.canvas.setAttribute("height", settings.board_height.toString());
		this.canvas.setAttribute("width", settings.board_width.toString());
		this.board_width = settings.board_width;
		this.board_height = settings.board_height;
		this.paddle_height = settings.paddle_height;
		this.paddle_width = settings.paddle_width;
		this.paddle_margin = settings.paddle_to_wall_dist;
		this.paddle_start = (this.canvas.height / 2) - (this.paddle_height / 2);
		this.ball_radius = settings.ball_radius;
	}

	private drawPaddle1(offset: number): void {
		this.ctx.fillStyle = WHITE;
		this.ctx.fillRect(this.paddle_margin, this.paddle_start + offset, this.paddle_width, this.paddle_height);
	}

	private drawPaddle2(offset: number): void {
		this.ctx.fillStyle = WHITE;
		this.ctx.fillRect(this.canvas.width - this.paddle_margin - this.paddle_width, this.paddle_start + offset, this.paddle_width, this.paddle_height);
	}

	private drawBall(ball_state: BallState): void {
		this.ctx.fillStyle = WHITE;
		this.ctx.beginPath();
		this.ctx.arc(ball_state.x, ball_state.y, this.ball_radius, 0, Math.PI * 2, true);
		this.ctx.fill();
	}

	private drawUsernames(players: [Player, Player]): void {
		this.ctx.fillStyle = WHITE;
		this.ctx.font = "15px 'Press Start 2P'";
		this.ctx.fillText(players[0].username, this.board_width / 4, 30);
		this.ctx.fillText(players[1].username, this.board_width * (3 / 4), 30);
	}

	private drawScores(players: [Player, Player]): void {
		this.ctx.fillStyle = WHITE;
		this.ctx.font = "30px 'Press Start 2P'";
		this.ctx.fillText(players[0].score.toString(), this.board_width / 4, 70);
		this.ctx.fillText(players[1].score.toString(), this.board_width * (3 / 4), 70);
	}

	private drawWaitingForPlayers(players: [Player, Player]): void {
		this.ctx.fillStyle = WHITE;
		this.ctx.font = "30px 'Press Start 2P'";
		this.ctx.textAlign = "center";
		this.ctx.fillText("Waiting for players", this.board_width / 2, this.board_height / 2);

		this.ctx.font = "15px 'Press Start 2P'";
		this.ctx.fillText("In a best of 5 rounds, the first to 3 wins", this.board_width / 2, this.board_height / 2 + 30);

		if (this.game_type === 'multi') {
			this.ctx.font = "15px 'Press Start 2P'";
			this.ctx.fillText("Press UP and DOWN to confirm", this.board_width / 2, this.board_height / 2 + 100);
		}
		if (this.game_type === 'single') {
			this.ctx.font = "15px 'Press Start 2P'";
			this.ctx.fillText("Press W and S to confirm", this.board_width / 4, this.board_height / 2 + 100);
			this.ctx.fillText("Press UP and DOWN to confirm", this.board_width * 3 / 4, this.board_height / 2 + 100);
		}

		this.ctx.font = "15px Press Start 2P";
		if (players[0].ready) {
			this.ctx.fillText(`Player ${players[0].username} READY`, this.board_width / 4, this.board_height * 0.75);
		}
		else {
			this.ctx.fillText(`Waiting for Player`, this.board_width / 4, this.board_height * 0.75);
			this.ctx.fillText(`${players[0].username}`, this.board_width / 4, this.board_height * 0.8);
		}
		if (players[1].ready) {
			this.ctx.fillText(`Player ${players[1].username} READY`, this.board_width * 0.75, this.board_height * 0.75);
		}
		else {
			this.ctx.fillText(`Waiting for Player`, this.board_width * 0.75, this.board_height * 0.75);
			this.ctx.fillText(`${players[1].username}`, this.board_width * 0.75, this.board_height * 0.8);
		}
	}

	private drawRemainingTimout(timeout: number): void {
		this.ctx.fillStyle = WHITE;
		this.ctx.font = "30px 'Press Start 2P'";
		this.ctx.textAlign = "center";
		this.ctx.fillText(`Resetting in ${timeout}...`, this.board_width / 2, this.board_height / 2);
	}

	private drawResult(winner: Player | null | undefined): void {
		this.ctx.font = "20px 'Press Start 2P'";
		this.ctx.textAlign = "center";
		let text: string;
		if (winner == null) {
			text = "The game is tie";
		}
		else {
			if (this.game_type === "multi") {
				text = `${winner.username} won the game`;
			}
			else if (this.game_type === "single") {
				text = `${winner.username} won the game`;
			}
			else {
				text = "Game ended";
			}
		}
		this.ctx.fillText(text, this.board_width / 2, this.board_height / 2);
	}

	private drawCenterLine(): void {
		this.ctx.setLineDash([10, 10]);
		this.ctx.strokeStyle = WHITE;
		this.ctx.lineWidth = this.paddle_width / 2;
		this.ctx.beginPath();
		this.ctx.moveTo(this.canvas.width / 2, 0);
		this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
		this.ctx.stroke();
	}

	private drawWaitingForConnection(): void {
		this.ctx.fillStyle = WHITE;
		this.ctx.font = "30px 'Press Start 2P'";
		this.ctx.textAlign = "center";
		this.ctx.fillText("Waiting for connection...", this.board_width / 2, this.board_height / 2);
	}

	private renderGame(): void {
		if (!this.state) return;

		this.drawUsernames(this.state.players);
		this.drawScores(this.state.players);
		if (this.state.game_state === "not_started") {
			this.drawWaitingForPlayers(this.state.players);
		}
		else if (this.state.game_state === "active") {
			this.drawCenterLine();
			this.drawPaddle1(this.state.objects.left_paddle.y_offset);
			this.drawPaddle2(this.state.objects.right_paddle.y_offset);
			this.drawBall(this.state.objects.ball);
		}
		else if (this.state.game_state === "resetting") {
			if (this.state.remaining_timeout !== undefined) {
				this.drawRemainingTimout(this.state.remaining_timeout);
			}
		}
		else if (this.state.game_state === "finished") {
			this.drawResult(this.state.winner);
		}
		else if (this.state.game_state === "paused") {
			this.ctx.fillStyle = WHITE;
			this.ctx.font = "20px 'Press Start 2P'";
			this.ctx.textAlign = "center";
			this.ctx.fillText("Other player is disconnected", this.board_width / 2, this.board_height / 2);
			if (this.state.remaining_timeout !== undefined) {
				this.ctx.fillText(`Game resumes in ${this.state.remaining_timeout}...`, this.board_width / 2, this.board_height / 2 + 30);
			}
		}
	}

	private render(): void {
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		if (!this.connected || !this.state) {
			this.drawWaitingForConnection();
		}
		else {
			this.renderGame();
		}
	}

	private updatePaddles(): void {
		if (this.game_type === GameType.MULTI_PLAYER) {
			const controls = this.controls as MultiplayerControls;
			if (controls.up === 1 && controls.down === 0) {
				this.socket.send(JSON.stringify({ type: MessageType.CONTROL_INPUT, payload: { 'input': 'up' } }));
			}
			else if (controls.up === 0 && controls.down === 1) {
				this.socket.send(JSON.stringify({ type: MessageType.CONTROL_INPUT, payload: { 'input': 'down' } }));
			}
		}
		else if (this.game_type === GameType.SINGLE_PLAYER) {
			const controls = this.controls as SingleplayerControls;
			let p1_input = "none";
			let p2_input = "none";
			if (controls.player1.up === 1 && controls.player1.down === 0) {
				p1_input = "up";
			}
			if (controls.player1.up === 0 && controls.player1.down === 1) {
				p1_input = "down";
			}
			if (controls.player2.up === 1 && controls.player2.down === 0) {
				p2_input = "up";
			}
			if (controls.player2.up === 0 && controls.player2.down === 1) {
				p2_input = "down";
			}
			// skip paddle update if nothing has changed
			if (p1_input === "none" && p2_input === "none") {
				return;
			}
			const msg = {
				type: MessageType.CONTROL_INPUT,
				payload: {
					'input_player1': p1_input,
					'input_player2': p2_input,
				}
			};
			this.socket.send(JSON.stringify(msg));
		}
	}

	private waitForConnection(): void {
		if (this.connected) {
			setInterval(this.updatePaddles.bind(this), 10);
		}
		else {
			setTimeout(this.waitForConnection.bind(this), 100);
		}
	}
}
