/* ************************************************************************** */
/*                                                                            */
/*                                                        :::      ::::::::   */
/*   game.ts                                            :+:      :+:    :+:   */
/*                                                    +:+ +:+         +:+     */
/*   By: mpellegr <mpellegr@student.hive.fi>        +#+  +:+       +#+        */
/*                                                +#+#+#+#+#+   +#+           */
/*   Created: 2025/04/04 09:54:11 by pleander          #+#    #+#             */
/*   Updated: 2025/12/12 00:00:00 by Claude           ###   ########.fr       */
/*                                                                            */
/* ************************************************************************** */

const PI: number = 3.14;

const BOARD_WIDTH: number = 800;
const BOARD_HEIGHT: number = 600;
const PADDLE_HEIGHT: number = 100;
const PADDLE_WIDTH: number = 10;
const PADDLE_TO_WALL_DIST: number = 20; // distance from wall to center of paddle
const BALL_RADIUS: number = 10;
const TOTAL_ROUNDS: number = 5;
const RESET_TIMEOUT_MILLIS: number = 3000;
const DEFAULT_BALL_SPEED: number = 3;

/** Returns random number in range */
const getRandom = (min: number, max: number): number => {
	return Math.random() * (max - min) + min;
};

export enum GameState {
	NOT_STARTED = "not_started",
	ACTIVE = "active",
	RESETTING = "resetting",
	FINSIHED = "finished",
	PAUSED = "paused"
}

export enum Input {
	UP = "up",
	DOWN = "down"
}

export enum Side {
	LEFT = "left",
	RIGHT = "right"
}

export interface PaddleSides {
	yTop: number;
	yBot: number;
	xLeft: number;
	xRight: number;
}

export interface Ball {
	x: number;
	y: number;
	vx: number;
	vy: number;
	speed: number;
	start_dir: number;
}

export interface GameObjects {
	ball: Ball;
	left_paddle: Paddle;
	right_paddle: Paddle;
}

export interface GameSettings {
	board_width: number;
	board_height: number;
	paddle_height: number;
	paddle_width: number;
	paddle_to_wall_dist: number;
	ball_radius: number;
}

export interface GameStateData {
	objects: GameObjects;
	finished_rounds: number;
	players: Player[];
	game_state: GameState;
	winner: Player | null;
	loser: Player | null;
	remaining_timeout: number;
}

export interface PlayerData {
	id: number;
	username: string;
	score: number;
	joined: boolean;
	ready: boolean;
	side: Side;
	inputs: Input[];
}

export class Player implements PlayerData {
	id: number;
	username: string;
	score: number;
	joined: boolean;
	ready: boolean;
	side: Side;
	inputs: Input[];

	constructor(id: number, username: string, side: Side) {
		this.id = id;
		this.username = username;
		this.score = 0;
		this.joined = false;
		this.ready = false;
		this.side = side;
		this.inputs = [];
	}
}

export class Paddle {
	y_offset: number;
	initial_pos: [number, number]; // center of rect block

	constructor(x_init: number, y_init: number) {
		this.y_offset = 0;
		this.initial_pos = [x_init, y_init];
	}

	get yCenter(): number {
		return this.initial_pos[1] + this.y_offset;
	}

	getSides(): PaddleSides {
		const yTop = this.initial_pos[1] + this.y_offset - PADDLE_HEIGHT / 2;
		const yBot = this.initial_pos[1] + this.y_offset + PADDLE_HEIGHT / 2;
		const xLeft = this.initial_pos[0] - PADDLE_WIDTH / 2;
		const xRight = this.initial_pos[0] + PADDLE_WIDTH / 2;

		return {
			yTop,
			yBot,
			xLeft,
			xRight
		};
	}
}

export class Game {
	finished_rounds: number;
	total_rounds: number;
	winner: Player | null;
	loser: Player | null;
	connected_players: number;
	players: Player[];
	gameState: GameState;
	resetTimer: Date;
	remainingTimout: number;
	objects: GameObjects;
	pauseTimestamp: number | null;
	type?: number;

	constructor(
		player1_id: number,
		player1_username: string,
		player2_id: number,
		player2_username: string
	) {
		this.finished_rounds = 0;
		this.total_rounds = TOTAL_ROUNDS;
		this.winner = null;
		this.loser = null;
		this.connected_players = 0;
		this.players = [];
		this.players.push(new Player(player1_id, player1_username, Side.LEFT));
		this.players.push(new Player(player2_id, player2_username, Side.RIGHT));
		this.gameState = GameState.NOT_STARTED;
		this.resetTimer = new Date();
		this.remainingTimout = 0;
		this.pauseTimestamp = null;
		this.objects = {
			ball: {
				x: BOARD_WIDTH / 2,
				y: BOARD_HEIGHT / 2,
				vx: 0,
				vy: 0,
				speed: DEFAULT_BALL_SPEED,
				start_dir: 0
			},
			left_paddle: new Paddle(PADDLE_TO_WALL_DIST, BOARD_HEIGHT / 2),
			right_paddle: new Paddle(BOARD_WIDTH - PADDLE_TO_WALL_DIST, BOARD_HEIGHT / 2)
		};
		this.resetBall();
	}

	get state(): GameStateData {
		return {
			objects: this.objects,
			finished_rounds: this.finished_rounds,
			players: this.players,
			game_state: this.gameState,
			winner: this.winner,
			loser: this.loser,
			remaining_timeout: Math.floor(this.remainingTimout / 1000) + 1
		};
	}

	getSettings(): GameSettings {
		return {
			board_width: BOARD_WIDTH,
			board_height: BOARD_HEIGHT,
			paddle_height: PADDLE_HEIGHT,
			paddle_width: PADDLE_WIDTH,
			paddle_to_wall_dist: PADDLE_TO_WALL_DIST,
			ball_radius: BALL_RADIUS
		};
	}

	/** Resets the ball to the center with a random starting direction */
	resetBall(): void {
		if (this.objects.ball.start_dir === 0) {
			if (Math.random() > 0.5) {
				this.objects.ball.start_dir = 1;
			} else {
				this.objects.ball.start_dir = -1;
			}
		}
		let angle: number;
		if (this.objects.ball.start_dir === 1) {
			angle = getRandom(-0.25 * PI, 0.25 * PI);
		} else if (this.objects.ball.start_dir === -1) {
			angle = getRandom(0.75 * PI, 1.25 * PI);
		} else {
			angle = 0;
		}
		const vx = Math.cos(angle) * DEFAULT_BALL_SPEED;
		const vy = Math.sin(angle) * DEFAULT_BALL_SPEED;
		this.objects.ball.x = BOARD_WIDTH / 2;
		this.objects.ball.y = BOARD_HEIGHT / 2;
		this.objects.ball.vx = vx;
		this.objects.ball.vy = vy;
		this.objects.ball.speed = DEFAULT_BALL_SPEED;
		this.objects.ball.start_dir = -this.objects.ball.start_dir;
	}

	getPlayer(id: number): Player | null {
		for (const p of this.players) {
			if (p.id === id) {
				return p;
			}
		}
		return null;
	}

	resetGame(): void {
		this.objects.left_paddle.y_offset = 0;
		this.objects.right_paddle.y_offset = 0;
		// Todo: maybe separate ball function with reset method
		this.resetBall();
	}

	acceptPlayerInput(id: number, input: string): boolean {
		const player = this.getPlayer(id);
		if (!player) {
			console.log(`Error: unrecognized id ${id}`);
			return false;
		}
		if (input === "up") {
			player.inputs.push(Input.UP);
		} else if (input === "down") {
			player.inputs.push(Input.DOWN);
		} else if (input === "none") {
			return true;
		} else {
			console.log(`Error: unkown input ${input}`);
			return false;
		}
		return true;
	}

	processInputs(): void {
		if (this.gameState === GameState.NOT_STARTED) {
			this.players.forEach((player) => {
				if (player.ready === false) {
					if (
						player.inputs.includes(Input.UP) &&
						player.inputs.includes(Input.DOWN)
					) {
						player.ready = true;
					}
				}
			});
		} else if (this.gameState === GameState.ACTIVE) {
			this.players.forEach((player) => {
				player.inputs.forEach((cmd) => {
					let change = 0;
					if (cmd === Input.UP) {
						change = -5;
					} else if (cmd === Input.DOWN) {
						change = 5;
					}

					if (player.side === Side.LEFT) {
						this.updatePaddle(change, this.objects.left_paddle);
					} else if (player.side === Side.RIGHT) {
						this.updatePaddle(change, this.objects.right_paddle);
					}
				});
				player.inputs = [];
			});
		} else if (this.gameState === GameState.RESETTING) {
			this.players.forEach((player) => {
				player.inputs = [];
			});
		}
	}

	updatePaddle(deltaY: number, paddle: Paddle): void {
		const centerY0 = paddle.initial_pos[1];
		const halfH = PADDLE_HEIGHT / 2;
		const minOff = halfH - centerY0;
		const maxOff = BOARD_HEIGHT - halfH - centerY0;

		let next = paddle.y_offset + deltaY;
		if (next < minOff) next = minOff;
		if (next > maxOff) next = maxOff;
		paddle.y_offset = next;
	}

	moveBall(): boolean {
		const ball = this.objects.ball;

		const lp_sides = this.objects.left_paddle.getSides();
		const rp_sides = this.objects.right_paddle.getSides();
		const max_bounce_angle = 0.45 * PI;

		// Hit right paddle
		if (ball.vx > 0) {
			const dx = rp_sides.xLeft - ball.x;
			if (
				dx > 0 &&
				dx <= BALL_RADIUS &&
				ball.y + BALL_RADIUS > rp_sides.yTop &&
				ball.y - BALL_RADIUS < rp_sides.yBot
			) {
				const dy = ball.y - this.objects.right_paddle.yCenter;
				let fraction = -dy / (PADDLE_HEIGHT / 2);
				if (fraction > 1) fraction = 1;
				if (fraction < -1) fraction = -1;
				const angle = fraction * max_bounce_angle;
				ball.vx = Math.cos(angle + PI) * this.objects.ball.speed;
				ball.vy = Math.sin(angle + PI) * this.objects.ball.speed;
				this.objects.ball.speed = this.objects.ball.speed * 1.1;
			}
		}

		// Hit left paddle
		if (ball.vx < 0) {
			const dx = ball.x - lp_sides.xRight;
			if (
				dx > 0 &&
				dx <= BALL_RADIUS &&
				ball.y + BALL_RADIUS > lp_sides.yTop &&
				ball.y - BALL_RADIUS < lp_sides.yBot
			) {
				const dy = ball.y - this.objects.left_paddle.yCenter;
				let fraction = dy / (PADDLE_HEIGHT / 2);
				if (fraction > 1) fraction = 1;
				if (fraction < -1) fraction = -1;
				const angle = fraction * max_bounce_angle;
				ball.vx = Math.cos(angle) * this.objects.ball.speed;
				ball.vy = Math.sin(angle) * this.objects.ball.speed;
				this.objects.ball.speed = this.objects.ball.speed * 1.1;
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
			this.players.forEach((player) => {
				if (player.side === Side.LEFT) {
					player.score += 1;
				}
			});
			return true;
		}

		// Hit left wall
		if (ball.x <= 0) {
			this.players.forEach((player) => {
				if (player.side === Side.RIGHT) {
					player.score += 1;
				}
			});
			return true;
		}

		ball.x += this.objects.ball.vx;
		ball.y += this.objects.ball.vy;
		return false;
	}

	pause(): void {
		if (this.gameState === GameState.ACTIVE) {
			this.gameState = GameState.PAUSED;
			this.pauseTimestamp = Date.now();
		}
	}

	resume(): void {
		if (this.gameState === GameState.PAUSED) {
			this.gameState = GameState.ACTIVE;
			this.pauseTimestamp = null;
		}
	}

	refreshGame(): void {
		if (this.gameState === GameState.PAUSED) {
			this.remainingTimout = 30000 - (Date.now() - (this.pauseTimestamp || 0));
			return;
		}
		const roundsToWin = Math.ceil(this.total_rounds / 2);
		this.processInputs();
		if (this.gameState === GameState.NOT_STARTED) {
			if (this.players[0].ready && this.players[1].ready) {
				this.gameState = GameState.ACTIVE;
				this.players[0].inputs = [];
				this.players[1].inputs = [];
			}
		} else if (this.gameState === GameState.ACTIVE) {
			if (this.moveBall()) {
				this.finished_rounds += 1;
				if (
					this.players[0].score >= roundsToWin ||
					this.players[1].score >= roundsToWin
				) {
					this.gameState = GameState.FINSIHED;
					if (this.players[0].score > this.players[1].score) {
						this.winner = this.players[0];
						this.loser = this.players[1];
					} else if (this.players[1].score > this.players[0].score) {
						this.winner = this.players[1];
						this.loser = this.players[0];
					} else {
						this.winner = null;
						this.loser = null;
					}
					return;
				}
				this.gameState = GameState.RESETTING;
				this.resetGame();
				this.resetTimer = new Date();
			}
		} else if (this.gameState === GameState.RESETTING) {
			const time = new Date();
			this.remainingTimout =
				RESET_TIMEOUT_MILLIS - (time.getTime() - this.resetTimer.getTime());
			if (this.remainingTimout < 0) {
				this.gameState = GameState.ACTIVE;
			}
		} else if (this.gameState === GameState.FINSIHED) {
			// Game finished - no action needed
		}
	}
}
