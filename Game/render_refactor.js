const MessageType = {
	JOIN: "join",
	CONTROL_INPUT: "input",
	SETTINGS: "settings",
	STATE: "state"
};

// colors
const BLACK = "#000000";
const WHITE = "#ffffff";

//========================
const GAME_ENDPOINT = "game";

class GameRenderer {
	constructor(server_uri, server_port, game_id, user_token) {
		this.server_uri = server_uri;
		this.game_id = game_id;
		this.user_token = user_token;
		this.socket = new WebSoocket(`ws://${server_uri}:${server_port}/${GAME_ENDPOINT}`);

		this.settings_applied = false;
		// game
		this.state = null;
		this.controls = {up: 0, down: 0};

		// window
		this.canvas = document.getElementById("game-canvas");
		this.ctx = canvas.getContext("2d");
		this.origin = window.location.origin.split(':');

		// game settings
		this.paddle_height;
		this.paddle_width;
		this.paddle_margin;
		this.paddle_start;
		this.ball_radius;
		this.board_width;
		this.board_height;

		this.init();
	}

	init() {
		document.addEventListener('keydown', (e) => {
			if (e.key === 'ArrowUp') {
				this.controls.up = 1;
			}
			else if (e.key === 'ArrowDown') {
				this.controls.down = 1;
			}
		});

		document.addEventListener('keyup', (e) => {
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
		});

		this.socket.addEventListener('message', (event) => {
			//console.log('Received:', event.data);
			const {type, payload} = JSON.parse(event.data);
			if (type === MessageType.SETTINGS) {
				this.updateSettings(payload);
			}
			else if (type === MessageType.STATE) {
				console.log("Got state:", payload);
				this.state = payload;
			}
		});

		this.socket.addEventListener('error', (e) => {
			console.error('WS Error:', e);
		});

		this.socket.addEventListener('close', (e) => {
			console.warn(`WebSocket closed: (${e.code}: ${e.reason})`);
		});

		this.wait_for_connection();
	}

	updateSettings(settings) {
		this.canvas.setAttribute("height", settings.board_height);
		this.canvas.setAttribute("width", settings.board_width);
		this.board_width = settings.board_width;
		this.board_height = settings.board_height;
		this.paddle_height = settings.paddle_height;
		this.paddle_width = settings.paddle_width;
		this.paddle_margin = settings.paddle_to_wall_dist;
		this.paddle_start = (canvas.height / 2) - (paddle_height / 2);
		this.ball_radius = settings.ball_radius;
		this.settings_applied = true;
	}

	draw_paddle_1(offset) {
		this.ctx.fillStyle = WHITE;
		this.ctx.fillRect(this.paddle_margin, this.paddle_start + offset, this.paddle_width, this.paddle_height);
	}

	draw_paddle_2(offset) {
		this.ctx.fillStyle = WHITE;
		this.ctx.fillRect(this.canvas.width - this.paddle_margin - this.paddle_width, this.paddle_start + offset, this.paddle_width, this.paddle_height);
	}

	draw_ball(ball_state) {
		this.ctx.fillStyle = WHITE;
		this.ctx.beginPath();
		this.ctx.arc(this.ball_state.x, ball_state.y, this.ball_radius, 0, Math.PI * 2, true);
		this.ctx.fill();
	}

	draw_scores(players) {
		this.ctx.fillStyle = WHITE;
		this.ctx.font = "48px serif";
		this.ctx.fillText(players[0].score, this.board_width / 4, 50);
		ctx.fillText(players[1].score, this.board_width * (3/4), 50);
	}

	draw_waiting_for_players(players) {
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
	draw_remaining_timeout(timeout) {

		this.ctx.font = "40px serif";
		this.ctx.textAlign = "center"
		this.ctx.fillText(`Resetting in ${timeout}...`, this.board_width / 2, this.board_height / 2);
	}

	draw_result(winner) {
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

	draw_center_line() {
		this.ctx.setLineDash([10, 10]);
		this.ctx.strokeStyle = WHITE;
		this.ctx.lineWidth = this.paddle_width / 2;
		this.ctx.beginPath();
		this.ctx.moveTo(this.canvas.width / 2, 0);
		this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
		this.ctx.stroke();
	}

	render() {
		this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
		this.draw_scores(this.state.players);

		//console.log(`Game state is: ${state.game_state}`);
		if (this.state.game_state === "not_started") {

			this.draw_waiting_for_players(this.state.players);
		}
		else if (this.state.game_state === "active") {
			this.draw_center_line();
			this.draw_paddle_1(this.state.objects.left_paddle.y_offset);
			this.draw_paddle_2(this.state.objects.right_paddle.y_offset);
			this.draw_ball(this.state.objects.ball);
		}
		else if (this.state.game_state === "resetting") {
			this.draw_remaining_timeout(this.state.remaining_timeout);
		}
		else if (this.state.game_state === "finished") {
			this.draw_result(this.state.winner);
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
	wait_for_connection() {
		console.log(`Waiting: settings_applied: ${this.settings_applied} state: ${this.state}`);
		if (this.settings_applied != false && this.state != null) {
			setInterval(this.updatePaddles, 10);
			setInterval(this.render, 10);
			console.log("Starting");
		}
		else {
			setTimeout(this.wait_for_connection, 100);
		}
	}
}
