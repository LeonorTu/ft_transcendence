// ************************************************************************** //
//                                                                            //
//                                                        :::      ::::::::   //
//   game.js                                            :+:      :+:    :+:   //
//                                                    +:+ +:+         +:+     //
//   By: pleander <pleander@student.hive.fi>        +#+  +:+       +#+        //
//                                                +#+#+#+#+#+   +#+           //
//   Created: 2025/04/04 09:54:11 by pleander          #+#    #+#             //
//   Updated: 2025/04/04 10:59:40 by pleander         ###   ########.fr       //
//                                                                            //
// ************************************************************************** //

const BOARD_WIDTH= 800;
const BOARD_HEIGHT = 600;
const PADDLE_HEIGHT = 100;
const PADDLE_WIDTH	= 10;
const PADDLE_TO_WALL_DIST = 20; // distance from wall to center of paddle
const BALL_RADIUS = 10;
const TOTAL_ROUNDS = 5;
const RESET_TIMEOUT_MILLIS = 3000;

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

const Side = {
	LEFT: "left",
	RIGHT: "right"
}

class Player {
	constructor(side) {
		this.id = -1;
		this.score = 0;
		this.ready = false;
		this.side = side;
		this.inputs = [];
	}
}

class Paddle {
	constructor(x_init, y_init) {
		this.y_offset = 0;
		this.initial_pos = [x_init, y_init]; // center of rect block
	}

	getSides() {
		const yTop = this.initial_pos[1] + this.y_offset - PADDLE_HEIGHT / 2;
		const yBot = this.initial_pos[1] + this.y_offset + PADDLE_HEIGHT / 2;
		const xLeft = this.initial_pos[0] - PADDLE_WIDTH / 2;
		const xRight = this.initial_pos[0] + PADDLE_WIDTH / 2;

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
		this.total_rounds = TOTAL_ROUNDS;
		this.winner = null;
		this.connected_players = 0;
		this.players = [];
		this.players.push(new Player(Side.LEFT));
		this.players.push(new Player(Side.RIGHT));
		this.gameState = GameState.NOT_STARTED;
		this.resetTimer = new Date();
		this.remainingTimout = 0;
		this.objects = {
			ball: {x: BOARD_WIDTH/2, y: BOARD_HEIGHT/2, vx: 2, vy: 1},
			left_paddle: new Paddle(PADDLE_TO_WALL_DIST, BOARD_HEIGHT / 2),
			right_paddle: new Paddle(BOARD_WIDTH - PADDLE_TO_WALL_DIST, BOARD_HEIGHT / 2)
		};
	}

	get state() {
		return {
			"objects": this.objects,
			"finished_rounds": this.finished_rounds,
			"players": this.players,
			"game_state": this.gameState,
			"winner": this.winner,
			"remaining_timeout": Math.floor(this.remainingTimout / 1000) + 1
		}
	}

	getSettings() {
		return {
			"board_width": BOARD_WIDTH,
			"board_height": BOARD_HEIGHT,
			"paddle_height": PADDLE_HEIGHT,
			"paddle_width": PADDLE_WIDTH,
			"paddle_to_wall_dist": PADDLE_TO_WALL_DIST,
			"ball_radius": BALL_RADIUS
		}
	}

	/**
	 * Adds the player to the game. Return true of successful and false otherwise.
	 *
	 * @param {int} id: Player id
	 */
	addPlayer(id, side) {
		if (!Number.isInteger(id)) {
			return false;
		}
		if (this.players.size < 2) {
			if (this.getPlayer(id) == null) { // player does not exist yet
				this.players.push(new Player(id, side));
			}
			return true;
		}
		return false;
	}

	getPlayer(id) {
		for (const p of this.players) {
			if (p.id == id) {
				return p;
			}
		}
		return null;
	}

	resetGame() {
		this.objects.left_paddle.y_offset = 0;
		this.objects.right_paddle.y_offset = 0;
		// Todo: maybe separate ball function with reset method
		this.objects.ball.x = BOARD_WIDTH / 2;
		this.objects.ball.y = BOARD_HEIGHT / 2;
		this.objects.ball.vx = 2;
		this.objects.ball.vy = 1;
	}

	acceptPlayerInput(id, input) {
		const player = this.getPlayer(id);
		if (!player) {
			console.log(`Error: unrecognized id ${id}`);
			return false;
		}
		if (input === "up") {
			player.inputs.push(Input.UP);
		}
		else if (input === "down") {
			player.inputs.push(Input.DOWN);
		}
		else {
			console.log(`Error: unkown input ${input}`)
			return false;
		}
		return true;
	}

	processInputs() {
		if (this.gameState === GameState.NOT_STARTED) {
			this.players.forEach((player) => {
				if (player.ready == false) {
					if (player.inputs.includes(Input.UP) &&
						player.inputs.includes(Input.DOWN)) {
						player.ready = true;
					}
				}
			});
		}
		else if(this.gameState === GameState.ACTIVE) {
			this.players.forEach((player) => {
				player.inputs.forEach((cmd) => {
					let change = 0;
					if (cmd === Input.UP) {
						change = -5;
					}
					else if (cmd == Input.DOWN) {
						change = 5;
					}

					if (player.side == Side.LEFT) {
						this.updatePaddle(change, this.objects.left_paddle);
					}
					else if (player.side == Side.RIGHT) {
						this.updatePaddle(change, this.objects.right_paddle);
					}
				});
				player.inputs = []
				});
		}
		else if (this.gameState === GameState.RESETTING) {
				this.players.forEach((player) => {
					player.inputs = [];
				});
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
			if (sides.yBot + change <= BOARD_HEIGHT)
				paddle.y_offset += change;
		}
	}

	moveBall() {
		let ball = this.objects.ball;

		const lp_sides = this.objects.left_paddle.getSides();
		const rp_sides = this.objects.right_paddle.getSides();
		
		// Hit right paddle
		if (ball.vx > 0) {
			let dx = rp_sides.xLeft - ball.x;
			if (dx > 0 && dx <= BALL_RADIUS && (ball.y > rp_sides.yTop && ball.y < rp_sides.yBot)) {
				ball.vx = -ball.vx;
			}
		}

		// Hit left paddle
		if (ball.vx < 0) {
			let dx = ball.x - lp_sides.xRight;
			if (dx > 0 && dx <= BALL_RADIUS && (ball.y > lp_sides.yTop && ball.y < lp_sides.yBot)) {
				ball.vx = -ball.vx;
			}
		}

		// Hit bottom of board
		if (BOARD_HEIGHT - ball.y <= BALL_RADIUS) {
			ball.vy = -ball.vy;
		}
		
		// Hit top of board
		if (ball.y <= BALL_RADIUS) {
			ball.vy = -ball.vy;
		}
		
		// Hit right wall
		if (ball.x >= BOARD_WIDTH) {
			this.players.forEach( (player) => {
				if (player.side === Side.LEFT) {
					player.score += 1;
				}
			});
			return (true);
		}
		//
		// Hit left wall
		if (ball.x <= 0) {
			this.players.forEach( (player) => {
				if (player.side === Side.RIGHT) {
					player.score += 1;
				}
			});
			return (true);
		}

		ball.x += this.objects.ball.vx;
		ball.y += this.objects.ball.vy;
		return (false);
	}

	refreshGame() {
		this.processInputs();
		if (this.gameState === GameState.NOT_STARTED)
		{
			if (this.players[0].ready && this.players[1].ready)
			{
				this.gameState = GameState.ACTIVE;
				this.players[0].inputs = [];
				this.players[1].inputs = [];
			}
		}
		else if (this.gameState === GameState.ACTIVE) {
			if (this.moveBall()) {
				this.finished_rounds += 1;
				if (this.finished_rounds >= this.total_rounds) {
					this.gameState = GameState.FINSIHED;
					if (this.players[0].score > this.players[1].score) {
						this.winner = this.players[0];
					}
					else if (this.players[1].score > this.players[0].score) {
						this.winner = this.players[1];
					}
					else {
						this.winner = null;
					}
					return;
				}
				this.gameState = GameState.RESETTING;
				this.resetGame();
				this.resetTimer = new Date();
			}
		}
		else if (this.gameState === GameState.RESETTING)
		{
			const time = new Date()
			this.remainingTimout = RESET_TIMEOUT_MILLIS - (time.getTime() - this.resetTimer.getTime());
			if (this.remainingTimout < 0) {
				this.gameState = GameState.ACTIVE;
			}

		}
		else if (this.gameState === GameState.FINSIHED) {

		}
	}
}

export {Game, Side, Input}
