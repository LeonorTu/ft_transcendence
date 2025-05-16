const MessageType = {
	JOIN: "join",
	CONTROL_INPUT: "input",
	SETTINGS: "settings",
	STATE: "state",
};

// colors
const BLACK = "#000000";
const WHITE = "#ffffff";

const GAME_ENDPOINT = "game";

const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;

export class GameRenderer {
	constructor(
		server_uri,
		server_port,
		game_id,
		user_token,
		document,
		wsUrl = null
	) {
		this.server_uri = server_uri;
		this.game_id = game_id;
		this.user_token = user_token;
		const websocketUrl =
			wsUrl ||
			`ws://${server_uri}:${server_port}/ws/game/${game_id}?token=${authToken}`;
		this.socket = new WebSocket(websocketUrl);
		this.connected = false;

		// game
		this.state = null;
		this.controls = {up: 0, down: 0};

		// window
		this.document = document;
		this.canvas = document.getElementById("game-canvas");
		this.ctx = this.canvas.getContext("2d");
		this.origin = window.location.origin.split(':');

		// game settings
		this.paddle_height;
		this.paddle_width;
		this.paddle_margin;
		this.paddle_start;
		this.ball_radius;
		this.board_width = DEFAULT_WIDTH;
		this.board_height = DEFAULT_HEIGHT;

		// Default settings to keep from resizing if height and width are correct
		this.canvas.setAttribute("height", this.board_height);
		this.canvas.setAttribute("width", this.board_width);
	}

	start() {
		this.document.addEventListener('keydown', (e) => {
			if (e.key === 'ArrowUp') {
				this.controls.up = 1;
			}
			else if (e.key === 'ArrowDown') {
				this.controls.down = 1;
			}
		});

		this.document.addEventListener('keyup', (e) => {
			if (e.key === 'ArrowUp') {
				this.controls.up = 0;
			}
			else if (e.key === 'ArrowDown') {
				this.controls.down = 0;
			}
		});

		this.socket.addEventListener('open', () => {
			this.socket.send(JSON.stringify({ type: MessageType.JOIN , payload: {
				'token': this.user_token,
				'game_id': this.game_id,
			}}));
			this.connected = true;
		});

		this.socket.addEventListener('message', (event) => {
			//console.log('Received:', event.data);
			const {type, payload} = JSON.parse(event.data);
			if (type === MessageType.SETTINGS) {
				this.updateSettings(payload);
			}
			else if (type === MessageType.STATE) {
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
	}

	updateSettings(settings) {
		this.canvas.setAttribute("height", settings.board_height);
		this.canvas.setAttribute("width", settings.board_width);
		this.board_width = settings.board_width;
		this.board_height = settings.board_height;
		this.paddle_height = settings.paddle_height;
		this.paddle_width = settings.paddle_width;
		this.paddle_margin = settings.paddle_to_wall_dist;
		this.paddle_start = (this.canvas.height / 2) - (this.paddle_height / 2);
		this.ball_radius = settings.ball_radius;
	}

	drawPaddle1(offset) {
		this.ctx.fillStyle = WHITE;
		this.ctx.fillRect(this.paddle_margin, this.paddle_start + offset, this.paddle_width, this.paddle_height);
	}

	drawPaddle2(offset) {
		this.ctx.fillStyle = WHITE;
		this.ctx.fillRect(this.canvas.width - this.paddle_margin - this.paddle_width, this.paddle_start + offset, this.paddle_width, this.paddle_height);
	}

	drawBall(ball_state) {
		this.ctx.fillStyle = WHITE;
		this.ctx.beginPath();
		this.ctx.arc(ball_state.x, ball_state.y, this.ball_radius, 0, Math.PI * 2, true);
		this.ctx.fill();
	}

	drawScores(players) {
		this.ctx.fillStyle = WHITE;
		this.ctx.font = "48px serif";
		this.ctx.fillText(players[0].score, this.board_width / 4, 50);
		this.ctx.fillText(players[1].score, this.board_width * (3/4), 50);
	}

	drawWaitingForPlayers(players) {
		this.ctx.fillStyle = WHITE;
		this.ctx.font = "40px serif";
		this.ctx.textAlign = "center"
		this.ctx.fillText("Waiting for players", this.board_width / 2, this.board_height / 2);

		this.ctx.font = "20px serif";
		this.ctx.fillText("Press UP and DOWN to confirm", this.board_width / 2, this.board_height / 2 + 30);

		this.ctx.font = "30px serif";
		if (players[0].ready) {
			this.ctx.fillText("Player 1 READY", this.board_width / 4, this.board_height * 0.75);
		}
		else {
			this.ctx.fillText("Waiting for Player 1", this.board_width / 4, this.board_height * 0.75);
		}
		if (players[1].ready) {
			this.ctx.fillText("Player 2 READY", this.board_width * 0.75, this.board_height * 0.75);
		}
		else {
			this.ctx.fillText("Waiting for Player 2", this.board_width * 0.75, this.board_height * 0.75);
		}

	}
	drawRemainingTimout(timeout) {
		this.ctx.fillStyle = WHITE;
		this.ctx.font = "40px serif";
		this.ctx.textAlign = "center"
		this.ctx.fillText(`Resetting in ${timeout}...`, this.board_width / 2, this.board_height / 2);
	}

	drawResult(winner) {
		this.ctx.font = "40px serif";
		this.ctx.textAlign = "center"
		let text;
		if (winner == null) {
			text = "The game is tie"
		}
		else {
			text = `Player ${winner.id} won the game`;
		}
		this.ctx.fillText(text, this.board_width / 2, this.board_height / 2);
	}

	drawCenterLine() {
		this.ctx.setLineDash([10, 10]);
		this.ctx.strokeStyle = WHITE;
		this.ctx.lineWidth = this.paddle_width / 2;
		this.ctx.beginPath();
		this.ctx.moveTo(this.canvas.width / 2, 0);
		this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
		this.ctx.stroke();
	}

	drawWaitingForConnection() {
		this.ctx.fillStyle = WHITE;
		this.ctx.font = "40px serif";
		this.ctx.textAlign = "center"
		this.ctx.fillText("Waiting for connection...", this.board_width / 2, this.board_height / 2);
	}

	renderGame() {
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
			this.drawRemainingTimout(this.state.remaining_timeout);
		}
		else if (this.state.game_state === "finished") {
			this.drawResult(this.state.winner);
		}
	}

	render() {
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		if (!this.connected || !this.state) {
			this.drawWaitingForConnection();
		}
		else {
			this.renderGame();
		}
	}

	updatePaddles() {
		if (this.controls.up == 1 && this.controls.down == 0) {
			this.socket.send(JSON.stringify({type: MessageType.CONTROL_INPUT, payload: {'input': 'up'}}));
		}
		else if (this.controls.up == 0 && this.controls.down == 1) {
			this.socket.send(JSON.stringify({type: MessageType.CONTROL_INPUT, payload: {'input': 'down'}}));
		}
	}

	waitForConnection() {
		if (this.connected) {
			setInterval(this.updatePaddles.bind(this), 10);
		}
		else {
			setTimeout(this.waitForConnection.bind(this), 100);
		}
	}
}
