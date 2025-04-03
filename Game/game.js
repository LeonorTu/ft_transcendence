const board_width= 800;
const board_height = 600;
const paddle_height = 100;
const paddle_width	= 10;
const paddle_wall_dist = 20; // distance from wall to center of paddle
const ball_radius = 10;

const GameState = {
	NOT_STARTED: "not_started",
	ACTIVE: "active",
	RESETTING: "resetting",
	FINSIHED: "finished"
}

const Input = {
	UP: "up",
	DOWN: "down"
}
class Player {
	constructor(player_id) {
		this.score = 0;
		this.id = player_id;
		this.ready = false;
		this.inputs = [];
		//this.socket?
	}
}

class Paddle {
	constructor(x_init, y_init) {
		this.y_offset = 0;
		this.initial_pos = [x_init, y_init]; // center of rect block
	}

	getSides() {
		const yTop = this.initial_pos[1] + this.y_offset - paddle_height / 2;
		const yBot = this.initial_pos[1] + this.y_offset + paddle_height / 2;
		const xLeft = this.initial_pos[0] - paddle_width / 2;
		const xRight = this.initial_pos[0] + paddle_width / 2;

		return {
			"yTop": yTop,
			"yBot": yBot,
			"xLeft": xLeft,
			"xRight": xRight
		}
	}
};


class Game {
	constructor() {
		this.finished_rounds = 0;
		this.players = {
			"player_1": new Player(1),
			"player_2": new Player(2)
		}
		this.gameState = GameState.NOT_STARTED;
		this.objects = {
			ball: {x: board_width/2, y: board_height/2, vx: 2, vy: 1},
			left_paddle: new Paddle(paddle_wall_dist, board_height / 2),
			right_paddle: new Paddle(board_width - paddle_wall_dist, board_height / 2)
		};
	}

	get state() {
		return {
			"objects": this.objects,
			"finished_rounds": this.finished_rounds,
			"players": this.players,
			"game_state": this.gameState
		}
	}

	getSettings() {
		return {
			"board_width": board_width,
			"board_height": board_height,
			"paddle_height": paddle_height,
			"paddle_width": paddle_width,
			"paddle_wall_dist": paddle_wall_dist,
			"ball_radius": ball_radius
		}
	}

	resetGame() {
		this.objects.left_paddle.y_offset = 0;
		this.objects.right_paddle.y_offset = 0;
		// Todo: maybe separate ball function with reset method
		this.objects.ball.x = board_width / 2;
		this.objects.ball.y = board_height / 2;
		this.objects.ball.vx = 2;
		this.objects.ball.vy = 1;
	}

	inputPlayer1(dir) {
		if (dir === "up") {
			this.players.player_1.inputs.push(Input.UP);
		}
		else if (dir === "down") {
			this.players.player_1.inputs.push(Input.DOWN);
		}
	}

	inputPlayer2(dir) {
		if (dir === "up") {
			this.players.player_2.inputs.push(Input.UP);
		}
		else if (dir === "down") {
			this.players.player_2.inputs.push(Input.DOWN);
		}
	}

	processInputs() {
		if (this.gameState === GameState.NOT_STARTED) {
			if (this.players.player_1.ready == false) {
				if (this.players.player_1.inputs.includes(Input.UP) &&
				this.players.player_1.inputs.includes(Input.DOWN)) {
					this.players.player_1.ready = true;
				}
			}
			if (this.players.player_2.ready == false) {
				if (this.players.player_2.inputs.includes(Input.UP) &&
				this.players.player_2.inputs.includes(Input.DOWN)) {
					this.players.player_2.ready = true;
				}
			}
		}
		else if(this.gameState === GameState.ACTIVE) {
			this.players.player_1.inputs.forEach((cmd) => {
				if (cmd === Input.UP) {
					this.updatePaddle(-5, this.objects.left_paddle);
				}
				else if (cmd === Input.DOWN) {
					this.updatePaddle(5, this.objects.left_paddle);
				}
				this.players.player_1.inputs = []
			});
			this.players.player_2.inputs.forEach((cmd) => {
				if (cmd === Input.UP) {
					this.updatePaddle(-5, this.objects.right_paddle);
				}
				else if (cmd === Input.DOWN) {
					this.updatePaddle(5, this.objects.right_paddle);
				}
			});
				this.players.player_2.inputs = []
		}

	}

	updatePaddle(change, paddle) {

		const sides = paddle.getSides();

		if (change < 0) {
			if (sides.yTop - change >= 0) {
				paddle.y_offset += change;
			}
		}
		if (change > 0) {
			if (sides.yBot + change <= board_height)
				paddle.y_offset += change;
		}
	}

	endRound(winner_player) {
		winner_player.score += 1;
		this.resetGame()
	}

	moveBall() {
		let ball = this.objects.ball;

		const lp_sides = this.objects.left_paddle.getSides();
		const rp_sides = this.objects.right_paddle.getSides();
		
		// Hit right paddle
		if (ball.vx > 0) {
			let dx = rp_sides.xLeft - ball.x;
			if (dx > 0 && dx <= ball_radius && (ball.y > rp_sides.yTop && ball.y < rp_sides.yBot)) {
				ball.vx = -ball.vx;
			}
		}

		// Hit left paddle
		if (ball.vx < 0) {
			let dx = ball.x - lp_sides.xRight;
			if (dx > 0 && dx <= ball_radius && (ball.y > lp_sides.yTop && ball.y < lp_sides.yBot)) {
				ball.vx = -ball.vx;
			}
		}

		// Hit bottom of board
		if (board_height - ball.y <= ball_radius) {
			ball.vy = -ball.vy;
		}
		
		// Hit top of board
		if (ball.y <= ball_radius) {
			ball.vy = -ball.vy;
		}
		
		// Hit right wall
		if (ball.x >= board_width) {
			this.endRound(this.players.player_1);
			return;
		}
		//
		// Hit left wall
		if (ball.x <= 0) {
			this.endRound(this.players.player_2);
			return;
		}

		ball.x += this.objects.ball.vx;
		ball.y += this.objects.ball.vy;
	}

	refreshGame() {
		this.processInputs();
		if (this.gameState === GameState.NOT_STARTED)
		{
			if (this.players.player_1.ready && this.players.player_2.ready) {
				this.gameState = GameState.ACTIVE;
				this.players.player_1.inputs = [];
				this.players.player_2.inputs = [];
			}
		}
		else if (this.gameState === GameState.ACTIVE) {
			this.moveBall();
		}
	}
}
		
export {Game}
